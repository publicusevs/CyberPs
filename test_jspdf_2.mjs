async function run() {
    const jsPDF = (await import('./frontend/node_modules/jspdf/dist/jspdf.node.min.js')).jsPDF;
    const pdf = new jsPDF('p', 'mm', 'a4');
    // A 1x1 pixel red JPEG base64
    const base64jpeg = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";
    pdf.addImage(base64jpeg, 'JPEG', 0, 0, 10, 10, undefined, 'FAST');
    const out = pdf.output();
    console.log('Size:', out.length);
    console.log('Contains /DCTDecode:', out.includes('/DCTDecode'));
    console.log('Contains /FlateDecode:', out.includes('/FlateDecode'));
}
run();
