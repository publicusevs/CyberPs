/**
 * Money Trail Graph Engine
 * Builds directed transaction graph from raw transaction data.
 * Supports: BFS layer traversal, circular detection, suspicion scoring.
 */

/**
 * Build adjacency-based directed graph from transaction records.
 * @param {Array} transactions [{sender_acc, receiver_acc, amount, utr_no, trans_date, platform}]
 * @param {Object} options { maxDepth, startAcc, minAmount, maxAmount }
 * @returns {Object} { nodes, edges, layers, circularEdges, suspiciousNodes, stats }
 */
function buildGraph(transactions, options = {}) {
    const {
        maxDepth = 5,
        startAcc = null,
        minAmount = 0,
        maxAmount = Infinity,
    } = options;

    // ── 1. Amount filter ──────────────────────────────────────────────────────
    const filteredTx = transactions.filter(t => {
        const amt = parseFloat(t.amount) || 0;
        return amt >= minAmount && amt <= (maxAmount === null ? Infinity : maxAmount);
    });

    // ── 2. Build adjacency maps and node stats ────────────────────────────────
    const adjacency = {};    // src  → [{target, amount, utr, date, platform}]
    const reverseAdj = {};   // dst  → [src]
    const nodeMap = {};      // acc  → {total_in, total_out, transactionCount, dates[]}

    const ensureNode = (acc) => {
        if (!nodeMap[acc]) nodeMap[acc] = { id: acc, total_in: 0, total_out: 0, transactionCount: 0, dates: [] };
        if (!adjacency[acc]) adjacency[acc] = [];
        if (!reverseAdj[acc]) reverseAdj[acc] = [];
    };

    filteredTx.forEach(t => {
        const src = (t.sender_acc || 'ROOT').toString().trim();
        const dst = (t.receiver_acc || 'UNKNOWN').toString().trim();
        if (src === dst) return; // skip self-loops
        const amt = parseFloat(t.amount) || 0;

        ensureNode(src);
        ensureNode(dst);

        adjacency[src].push({ target: dst, amount: amt, utr: t.utr_no, date: t.trans_date, platform: t.platform });
        if (!reverseAdj[dst].includes(src)) reverseAdj[dst].push(src);

        nodeMap[src].total_out += amt;
        nodeMap[src].transactionCount++;
        nodeMap[dst].total_in += amt;
        if (t.trans_date) nodeMap[dst].dates.push(new Date(t.trans_date));
        if (t.trans_date) nodeMap[src].dates.push(new Date(t.trans_date));
    });

    // ── 3. Identify root nodes ────────────────────────────────────────────────
    let roots = [];
    if (startAcc && nodeMap[startAcc]) {
        roots = [startAcc];
    } else {
        roots = Object.keys(nodeMap).filter(acc => (reverseAdj[acc] || []).length === 0);
        if (roots.length === 0 && Object.keys(nodeMap).length > 0) {
            // All cyclic — pick node with most outgoing edges as root
            roots = [Object.keys(nodeMap).sort(
                (a, b) => (adjacency[b] || []).length - (adjacency[a] || []).length
            )[0]];
        }
    }

    // ── 4. BFS: assign layers + detect circular edges ─────────────────────────
    const layersMap = {};       // layerNum (int) → [acc]
    const nodeLayer = {};       // acc → layerNum
    const circularEdges = [];
    const visited = new Set();

    // Initialize roots at layer 1
    roots.forEach(r => {
        nodeLayer[r] = 1;
        layersMap[1] = layersMap[1] || [];
        if (!layersMap[1].includes(r)) layersMap[1].push(r);
    });

    let queue = roots.map(r => ({ acc: r, layer: 1, path: new Set([r]) }));

    while (queue.length > 0) {
        const { acc, layer, path } = queue.shift();
        if (visited.has(acc)) continue;
        visited.add(acc);

        if (layer >= maxDepth) continue;

        (adjacency[acc] || []).forEach(edge => {
            if (path.has(edge.target)) {
                // Circular edge detected
                circularEdges.push({ from: acc, to: edge.target, amount: edge.amount, utr: edge.utr });
                return;
            }
            const nextLayer = layer + 1;
            if (!nodeLayer[edge.target] || nodeLayer[edge.target] > nextLayer) {
                nodeLayer[edge.target] = nextLayer;
            }
            layersMap[nextLayer] = layersMap[nextLayer] || [];
            if (!layersMap[nextLayer].includes(edge.target)) layersMap[nextLayer].push(edge.target);

            const newPath = new Set(path);
            newPath.add(edge.target);
            queue.push({ acc: edge.target, layer: nextLayer, path: newPath });
        });
    }

    // Assign unvisited nodes to layer 99 (disconnected)
    Object.keys(nodeMap).forEach(acc => {
        if (nodeLayer[acc] === undefined) {
            nodeLayer[acc] = 99;
            layersMap[99] = layersMap[99] || [];
            if (!layersMap[99].includes(acc)) layersMap[99].push(acc);
        }
    });

    // ── 5. Build edge list ────────────────────────────────────────────────────
    const edges = [];
    const edgeSet = new Set();

    filteredTx.forEach(t => {
        const src = (t.sender_acc || 'ROOT').toString().trim();
        const dst = (t.receiver_acc || 'UNKNOWN').toString().trim();
        if (src === dst) return;
        const amt = parseFloat(t.amount) || 0;
        const srcLayer = nodeLayer[src] || 99;
        const dstLayer = nodeLayer[dst] || 99;
        
        // Skip edges where either source or destination is beyond maxDepth (layer 99)
        if (srcLayer === 99 || dstLayer === 99) return;

        const edgeKey = `${src}-->${dst}::${t.utr_no}`;
        if (!edgeSet.has(edgeKey)) {
            edgeSet.add(edgeKey);
            const isCircular = circularEdges.some(ce => ce.from === src && ce.to === dst);
            edges.push({
                id: edgeKey,
                from: src, to: dst,
                amount: amt,
                utr: t.utr_no,
                date: t.trans_date,
                platform: t.platform,
                isCircular
            });
        }
    });

    // ── 6. Suspicion scoring ──────────────────────────────────────────────────
    const totalFlow = Object.values(nodeMap).reduce((s, n) => s + n.total_in, 0);
    const circularAccounts = new Set([
        ...circularEdges.map(c => c.from),
        ...circularEdges.map(c => c.to)
    ]);

    Object.keys(nodeMap).forEach(acc => {
        const node = nodeMap[acc];
        node.suspicionReasons = [];
        node.suspicionLevel = 'normal';

        const outDegree = (adjacency[acc] || []).length;

        if (circularAccounts.has(acc)) {
            node.suspicionReasons.push('CIRCULAR_TRANSACTION');
            node.suspicionLevel = 'critical';
        }

        if (outDegree > 4) {
            node.suspicionReasons.push('HIGH_FREQUENCY_TRANSFER');
            if (node.suspicionLevel !== 'critical') node.suspicionLevel = 'moderate';
        }

        if (totalFlow > 0 && node.total_out > totalFlow * 0.3) {
            node.suspicionReasons.push('LARGE_TRANSFER_VOLUME');
            if (node.suspicionLevel === 'normal') node.suspicionLevel = 'moderate';
        }

        // Rapid multi-layer: check if funds move through multiple layers quickly
        const layer = nodeLayer[acc] || 1;
        if (layer >= 3 && node.dates.length > 0) {
            const sortedDates = node.dates.sort((a, b) => a - b);
            const spanHours = (sortedDates[sortedDates.length - 1] - sortedDates[0]) / (1000 * 3600);
            if (spanHours < 48 && outDegree > 0) {
                node.suspicionReasons.push('RAPID_MULTILAYER_MOVEMENT');
                if (node.suspicionLevel === 'normal') node.suspicionLevel = 'moderate';
            }
        }
    });

    // ── 7. Assemble output ────────────────────────────────────────────────────
    const visibleAccs = Object.keys(nodeMap).filter(acc => (nodeLayer[acc] || 99) !== 99);

    const nodes = visibleAccs.map(acc => ({
        id: acc,
        label: acc,
        layer: nodeLayer[acc] || 99,
        total_in: Math.round(nodeMap[acc].total_in * 100) / 100,
        total_out: Math.round(nodeMap[acc].total_out * 100) / 100,
        transactionCount: nodeMap[acc].transactionCount,
        suspicionLevel: nodeMap[acc].suspicionLevel,
        suspicionReasons: nodeMap[acc].suspicionReasons,
        isRoot: roots.includes(acc),
        isCircular: circularAccounts.has(acc),
    }));

    const layersFormatted = {};
    Object.keys(layersMap).filter(l => l !== '99').sort((a, b) => +a - +b).forEach(l => {
        layersFormatted[`layer${l}`] = layersMap[l];
    });

    const suspiciousNodesList = nodes.filter(n => n.suspicionLevel !== 'normal').map(n => n.id);
    
    const visibleTotalFlow = visibleAccs.reduce((s, acc) => s + nodeMap[acc].total_in, 0);

    const stats = {
        totalNodes: nodes.length,
        totalEdges: edges.length,
        totalLayers: Object.keys(layersFormatted).length,
        circularTransactions: circularEdges.length,
        suspiciousNodes: suspiciousNodesList.length,
        totalFlow: Math.round(visibleTotalFlow * 100) / 100,
        rootAccounts: roots,
    };

    return { nodes, edges, layers: layersFormatted, circularEdges, suspiciousNodes: suspiciousNodesList, stats };
}

/**
 * Parse raw Excel rows into normalized transaction records.
 * Tries multiple column naming conventions commonly found in Indian bank statements.
 */
function parseExcelForTrail(rawData) {
    const transactions = [];

    const lastNodeAtLayer = {}; // layerNumber -> account_number

    rawData.forEach((row, idx) => {
        // ── Receiver / Destination account ─────────────────────────────────
        const receiver_acc =
            row['Account No'] || row['Account No.'] || row['Account Number'] ||
            row['Account No./ (Wallet/PG/PA) Id'] || row['Beneficiary Account'] ||
            row['Target Account'] || row['Dest Account'] || row['Receiver Account'] ||
            row['To Account'] || row['Credit Account'] || row['receiver_account'] ||
            row['ACCOUNT NO'] || row['account_number_2'] || row['Payee Account'] ||
            row['Wallet ID'] || row['Wallet Id'] || null;

        if (!receiver_acc) return; // Skip rows with no destination

        // ── Sender / Source account ─────────────────────────────────────────
        let sender_acc =
            row['Sender Account'] || row['Source Account'] || row['From Account'] ||
            row['Sender Acc'] || row['From Acc'] || row['Debit Account'] ||
            row['Sender Account No'] || row['sender_account'] || row['SENDER ACCOUNT'] ||
            row['SENDER ACC'] || row['Payer Account'] || row['Payer Acc'] ||
            row['account_number'] || null;

        // ── Layer (if present) ───────────────────────────────────────────────
        let layerRaw = row['Layer'] || row['layer'] || row['LAYER'];
        let numericLayer = null;
        
        if (layerRaw !== undefined && layerRaw !== null) {
            const strLayer = layerRaw.toString().trim();
            const match = strLayer.match(/\d+/);
            if (match) numericLayer = parseInt(match[0], 10);
        }

        // LEA Fallback Logic: If sender is missing but layer is known, 
        // infer sender as the last known account from Layer N-1.
        if (!sender_acc && numericLayer !== null) {
            if (numericLayer === 1) {
                sender_acc = 'ROOT';
            } else if (numericLayer > 1 && lastNodeAtLayer[numericLayer - 1]) {
                sender_acc = lastNodeAtLayer[numericLayer - 1];
            } else {
                sender_acc = 'ROOT'; // Fallback if no parent layer found
            }
        }

        // Update tracking for future rows
        if (numericLayer !== null) {
            lastNodeAtLayer[numericLayer] = receiver_acc.toString().trim();
        } else if (!sender_acc) {
            // Implicit layers: if no layer and no sender, default it
            sender_acc = 'ROOT';
        }

        // ── Amount ──────────────────────────────────────────────────────────
        let rawAmount = row['Transaction Amount'] || row['Amount Rs.'] || row['Amount'] ||
            row['TRANSACTION AMOUNT'] || row['Credit Amount'] || row['Debit Amount'] || 0;
        const amount = typeof rawAmount === 'string'
            ? parseFloat(rawAmount.replace(/,/g, '').trim())
            : parseFloat(rawAmount);

        // ── Date ────────────────────────────────────────────────────────────
        let rawDate = row['Transaction Date'] || row['Date'] || row['TRANSACTION DATE'] ||
            row['Trans Date'] || row['Value Date'] || null;
        let trans_date;
        if (rawDate && typeof rawDate === 'number') {
            trans_date = new Date((rawDate - 25569) * 86400 * 1000);
        } else if (rawDate) {
            trans_date = new Date(rawDate);
        } else {
            trans_date = new Date();
        }

        // ── UTR / Reference ─────────────────────────────────────────────────
        const utr_no =
            row['Transaction Id / UTR Number'] || row['Transaction Id / UTR Number2'] ||
            row['UTR'] || row['Transaction Id'] || row['Ref No'] ||
            row['Reference No'] || row['UTR No'] || row['TRANSACTION ID'] ||
            row['UTR NUMBER'] || row['Ref Number'] ||
            `ROW_${idx}_${Date.now()}`;

        // ── Platform/Bank ────────────────────────────────────────────────────
        const platform =
            row['Bank/Bc'] || row['Bank/ Bc'] || row['Bank Name'] || row['Bank/FIs'] ||
            row['Bank / FIs'] || row['Bank'] || row['BANK NAME'] || row['Beneficiary Bank'] ||
            row['Target Bank'] || 'Unknown';

        transactions.push({
            sender_acc: sender_acc ? sender_acc.toString().trim() : 'ROOT',
            receiver_acc: receiver_acc.toString().trim(),
            amount: isNaN(amount) ? 0 : amount,
            utr_no: utr_no.toString().trim().substring(0, 150),
            trans_date: isNaN(trans_date?.getTime?.()) ? new Date() : trans_date,
            platform: platform.toString().trim().substring(0, 100),
            layer: numericLayer ? numericLayer.toString() : null,
        });
    });

    return transactions;
}

/**
 * Detect available columns in an Excel sheet for user mapping UI.
 */
function detectColumns(rawData) {
    if (!rawData || rawData.length === 0) return [];
    return Object.keys(rawData[0]).filter(k => k && k.trim().length > 0);
}

module.exports = { buildGraph, parseExcelForTrail, detectColumns };
