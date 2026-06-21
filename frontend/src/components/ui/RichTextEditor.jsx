import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Bold, Italic, Underline, List, AlignLeft, AlignCenter, AlignRight, Image as ImageIcon, Table, Indent, Outdent, WrapText } from 'lucide-react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import QuillTableBetter from 'quill-table-better';
import 'quill-table-better/dist/quill-table-better.css';

if (typeof window !== 'undefined') {
    const SizeStyle = Quill.import('attributors/style/size');
    SizeStyle.whitelist = ['8px', '9px', '10px', '11px', '12px', '14px', '16px', '18px', '20px', '22px', '24px', '26px', '28px', '32px', '36px', '40px', '48px', '50px'];
    Quill.register(SizeStyle, true);

    Quill.register({
        'modules/table-better': QuillTableBetter
    }, true);
}

const RichTextEditor = forwardRef(({
    id = "quill-editor",
    value = undefined,
    defaultValue = "",
    onChange,
    onSelectionChange,
    margins = { top: 50, left: 50, right: 50, bottom: 50 },
    lineSpacing = "1.5",
    paragraphSpacing = "12",
    wordWrap = true,
    printMode = false,
    onWordWrapChange,
    onLineSpacingChange,
    onParagraphSpacingChange,
    style = {},
    className = "",
    editorContainerClassName = "",
    toolbarSticky = true,
    toolbarTop = "80px"
}, ref) => {
    const editorContainerRef = useRef(null);
    const quillInstance = useRef(null);
    const isLocalUpdate = useRef(false);

    useEffect(() => {
        if (!editorContainerRef.current || quillInstance.current) return;

        quillInstance.current = new Quill(editorContainerRef.current, {
            theme: 'snow',
            modules: {
                toolbar: {
                    container: `#toolbar-${id}`
                },
                table: false,
                'table-better': {
                    language: 'en_US',
                    toolbarTable: false
                },
                keyboard: {
                    bindings: QuillTableBetter.keyboardBindings
                }
            }
        });

        if (value !== undefined) {
            isLocalUpdate.current = true;
            quillInstance.current.root.innerHTML = value;
            isLocalUpdate.current = false;
        } else if (defaultValue) {
            isLocalUpdate.current = true;
            quillInstance.current.root.innerHTML = defaultValue;
            isLocalUpdate.current = false;
        }

        quillInstance.current.on('text-change', () => {
            if (onChange) {
                isLocalUpdate.current = true;
                onChange(quillInstance.current.root.innerHTML);
                isLocalUpdate.current = false;
            }
        });

        quillInstance.current.on('selection-change', (range) => {
            if (onSelectionChange) {
                onSelectionChange(range, quillInstance.current);
            }
        });

        return () => {
            quillInstance.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    useEffect(() => {
        if (quillInstance.current && value !== undefined && !isLocalUpdate.current) {
             if (quillInstance.current.root.innerHTML !== value) {
                  isLocalUpdate.current = true;
                  quillInstance.current.root.innerHTML = value;
                  isLocalUpdate.current = false;
             }
        }
    }, [value]);

    useImperativeHandle(ref, () => ({
        getQuill: () => quillInstance.current
    }));

    useEffect(() => {
        if (quillInstance.current) {
            const editorEl = quillInstance.current.root;
            if (editorEl) {
                editorEl.style.paddingTop = `${margins.top !== undefined ? margins.top : 50}px`;
                editorEl.style.paddingLeft = `${margins.left !== undefined ? margins.left : 50}px`;
                editorEl.style.paddingRight = `${margins.right !== undefined ? margins.right : 50}px`;
                editorEl.style.paddingBottom = `${margins.bottom !== undefined ? margins.bottom : 50}px`;
                editorEl.style.lineHeight = lineSpacing || "1.5";
                editorEl.style.whiteSpace = wordWrap ? 'pre-wrap' : 'pre';
                editorEl.style.overflowX = wordWrap ? 'visible' : 'auto';
                editorEl.style.boxSizing = 'border-box';
            }
        }
    }, [margins, lineSpacing, wordWrap, printMode]);

    const applyFontSize = (size) => {
        if (quillInstance.current) {
            quillInstance.current.format('size', `${size}px`);
        }
    };

    const insertTable = () => {
        if (quillInstance.current) {
            const rowsStr = prompt("Enter number of rows:", "3");
            if (rowsStr === null) return;
            const colsStr = prompt("Enter number of columns:", "3");
            if (colsStr === null) return;
            
            const rows = parseInt(rowsStr, 10) || 3;
            const cols = parseInt(colsStr, 10) || 3;
            
            const tableModule = quillInstance.current.getModule('table-better');
            if (tableModule) {
                tableModule.insertTable(rows, cols);
            } else {
                alert("Table module not initialized.");
            }
        }
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file || !quillInstance.current) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const base64Image = event.target.result;
            const range = quillInstance.current.getSelection() || { index: quillInstance.current.getLength() };
            quillInstance.current.insertEmbed(range.index, 'image', base64Image);
        };
        reader.readAsDataURL(file);
    };

    const formatText = (command) => {
        if (!quillInstance.current) return;
        const q = quillInstance.current;
        q.focus();
        
        if (command === 'bold' || command === 'italic' || command === 'underline') {
            const current = q.getFormat()[command];
            q.format(command, !current);
        } else if (command === 'justifyLeft') {
            q.format('align', false);
        } else if (command === 'justifyCenter') {
            q.format('align', 'center');
        } else if (command === 'justifyRight') {
            q.format('align', 'right');
        } else if (command === 'insertUnorderedList') {
            const currentFormat = q.getFormat();
            if (currentFormat.list === 'bullet') {
                q.format('list', false);
            } else {
                q.format('list', 'bullet');
            }
        }
    };

    return (
        <div className={`relative ${className}`} style={style}>
            {!printMode && (
                <div 
                    id={`toolbar-${id}`} 
                    className={`bg-slate-900 border-b border-slate-800 p-4 flex flex-wrap items-center justify-between gap-6 z-[50] shadow-xl no-print rounded-t-2xl ${toolbarSticky ? 'sticky' : ''}`}
                    style={{ top: toolbarSticky ? toolbarTop : undefined }}
                >
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 shadow-inner">
                            <button onClick={() => formatText('bold')} className="ql-bold p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all" title="Bold"><Bold size={16} /></button>
                            <button onClick={() => formatText('italic')} className="ql-italic p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all" title="Italic"><Italic size={16} /></button>
                            <button onClick={() => formatText('underline')} className="ql-underline p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all" title="Underline"><Underline size={16} /></button>
                        </div>

                        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 shadow-inner">
                            <button onClick={() => formatText('justifyLeft')} className="ql-align p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all" value="" title="Align Left"><AlignLeft size={16} /></button>
                            <button onClick={() => formatText('justifyCenter')} className="ql-align p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all" value="center" title="Align Center"><AlignCenter size={16} /></button>
                            <button onClick={() => formatText('justifyRight')} className="ql-align p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all" value="right" title="Align Right"><AlignRight size={16} /></button>
                        </div>

                        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 shadow-inner">
                            <button onClick={() => formatText('insertUnorderedList')} className="ql-list p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all" value="bullet" title="List"><List size={16} /></button>
                            <label className="p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all cursor-pointer" title="Insert Image">
                                <ImageIcon size={16} />
                                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                            </label>
                            <button onClick={insertTable} className="p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all" title="Insert Table"><Table size={16} /></button>
                        </div>

                        {onWordWrapChange && (
                            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 shadow-inner">
                                <button className="ql-indent p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all" value="-1" title="Decrease Indent"><Outdent size={16} /></button>
                                <button className="ql-indent p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all" value="+1" title="Increase Indent"><Indent size={16} /></button>
                                <button onClick={() => onWordWrapChange(!wordWrap)} className={`p-2.5 rounded-lg transition-all ${wordWrap ? 'text-emerald-400 bg-white/10' : 'text-slate-400 hover:text-white hover:bg-white/10'}`} title="Toggle Word Wrap"><WrapText size={16} /></button>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/10 shadow-inner">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Font Size</span>
                            <select 
                                onChange={(e) => applyFontSize(e.target.value)}
                                className="bg-transparent text-emerald-400 text-[11px] font-black outline-none cursor-pointer hover:text-emerald-300 transition-colors w-16"
                                defaultValue="16"
                            >
                                {[8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 32, 36, 40, 48, 50].map(size => (
                                    <option key={size} value={size}>{size}px</option>
                                ))}
                            </select>
                        </div>

                        {onLineSpacingChange && (
                            <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/10 shadow-inner">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Line Spacing</span>
                                <select 
                                    value={lineSpacing}
                                    onChange={(e) => onLineSpacingChange(e.target.value)}
                                    className="bg-transparent text-emerald-400 text-[11px] font-black outline-none cursor-pointer hover:text-emerald-300 transition-colors w-16"
                                >
                                    {['1.0', '1.15', '1.25', '1.5', '1.75', '2.0', '2.5'].map(space => (
                                        <option key={space} value={space}>{space}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {onParagraphSpacingChange && (
                            <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/10 shadow-inner">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Para Spacing</span>
                                <select 
                                    value={paragraphSpacing}
                                    onChange={(e) => onParagraphSpacingChange(e.target.value)}
                                    className="bg-transparent text-emerald-400 text-[11px] font-black outline-none cursor-pointer hover:text-emerald-300 transition-colors w-16"
                                >
                                    {['0', '4', '8', '12', '16', '20', '24', '32'].map(space => (
                                        <option key={space} value={space}>{space}px</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div className="h-8 w-px bg-white/10 mx-2 hidden sm:block"></div>
                        <div className="hidden sm:flex flex-col items-end">
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Editor Status</p>
                            <p className="text-[10px] font-black text-emerald-500 uppercase italic">Active_Encryption_Link</p>
                        </div>
                    </div>
                </div>
            )}
            <style>{`
                #${id} p {
                    margin-bottom: ${paragraphSpacing}px !important;
                    margin-top: 0px !important;
                }
                .ql-editor table {
                    border-collapse: collapse;
                    margin-left: auto !important;
                    margin-right: auto !important;
                    margin-top: 15px !important;
                    margin-bottom: 15px !important;
                }
                .ql-editor td, .ql-editor th {
                    border: 1px solid #cbd5e1;
                    padding: 8px 12px;
                    min-width: 50px;
                }
                .ql-container.ql-snow {
                    border: none !important;
                    font-family: inherit;
                    font-size: inherit;
                }
                .ql-editor {
                    outline: none;
                }
                #toolbar-${id} select option {
                    background-color: #0f172a !important;
                    color: #ffffff !important;
                }
            `}</style>
            <div 
                ref={editorContainerRef} 
                id={id}
                className={`bg-white text-slate-800 transition-all ${editorContainerClassName} ${!printMode ? 'rounded-b-2xl' : ''}`}
            />
        </div>
    );
});

RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;
