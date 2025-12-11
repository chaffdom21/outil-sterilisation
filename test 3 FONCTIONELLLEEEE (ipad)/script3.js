// ---- Gestion du tableau ----
function ajouterColonne() {
    const table = document.getElementById("grid");
    const theadRows = table.querySelectorAll("thead tr");
    const numerosRow = theadRows[1];
    const newIndex = numerosRow.cells.length + 1;

    const th = document.createElement("th");
    th.textContent = newIndex;
    numerosRow.appendChild(th);

    table.querySelectorAll("tbody tr").forEach(tr => {
        const td = document.createElement("td");
        const cb = document.createElement("input");
        cb.type = "checkbox";
        td.appendChild(cb);
        tr.appendChild(td);
    });

    const firstRow = theadRows[0];
    const colspanCell = firstRow.querySelector("th[colspan]");
    colspanCell.colSpan = numerosRow.cells.length;
}

function supprimerColonne() {
    const table = document.getElementById("grid");
    const theadRows = table.querySelectorAll("thead tr");
    const numerosRow = theadRows[1];

    if (numerosRow.cells.length > 1) {
        numerosRow.removeChild(numerosRow.lastElementChild);
        table.querySelectorAll("tbody tr").forEach(tr => {
            tr.removeChild(tr.lastElementChild);
        });
        const firstRow = theadRows[0];
        const colspanCell = firstRow.querySelector("th[colspan]");
        colspanCell.colSpan = numerosRow.cells.length;
    }
}

// ---- Persistance locale ----
document.addEventListener('DOMContentLoaded', () => {
    const y = document.getElementById('dateY');
    const m = document.getElementById('dateM');
    const d = document.getElementById('dateD');
    const codeInput = document.getElementById('code');
    const q1 = document.getElementById('q1');
    const dm = document.getElementById('dm');
    const resolution = document.getElementById('resolution');

    function onlyDigits(el){ el.value = el.value.replace(/\D+/g,''); }
    function pad2(v){ return String(v).padStart(2,'0'); }

    function updateCombined(){
        if(y.value.length===4 && m.value.length>=1 && d.value.length>=1){
            const combined = `${y.value}/${pad2(m.value)}/${pad2(d.value)}`;
            localStorage.setItem('st_date', combined);
        }
    }

    (function initTriplet(){
        const saved = localStorage.getItem('st_date');
        if(saved){
            const parts = saved.split('/');
            if(parts.length===3){
                y.value = parts[0];
                m.value = parts[1];
                d.value = parts[2];
            }
        }
        codeInput.value = localStorage.getItem('st_code') || '';
        q1.value = localStorage.getItem('st_q1') || '';
        dm.value = localStorage.getItem('st_dm') || '';
        resolution.value = localStorage.getItem('st_resolution') || '';

        document.querySelectorAll("table input[type=checkbox]").forEach((box,i)=>{
            if(localStorage.getItem("checkbox"+i)==="true") box.checked = true;
            box.addEventListener("change", ()=> localStorage.setItem("checkbox"+i, box.checked));
        });
    })();

    [y,m,d].forEach(el=> el.addEventListener('input', ()=>{ onlyDigits(el); updateCombined(); }));
    codeInput.addEventListener('input', ()=> localStorage.setItem('st_code', codeInput.value));
    q1.addEventListener('input', ()=> localStorage.setItem('st_q1', q1.value));
    dm.addEventListener('input', ()=> localStorage.setItem('st_dm', dm.value));
    resolution.addEventListener('input', ()=> localStorage.setItem('st_resolution', resolution.value));
});

// ---- Réinitialisation formulaire ----
function resetSterilForm(){
    try {
        const form = document.getElementById('steri-form');

        document.querySelectorAll("table input[type=checkbox]").forEach((cb,i)=>{
            cb.checked=false;
            localStorage.removeItem("checkbox"+i);
        });

        ['dateY','dateM','dateD','code','q1','dm','resolution',
            'question-4','question-5','question-6','question-7','question-8','question-9'].forEach(id=>{
            const el = document.getElementById(id);
            if(el) el.value='';
            localStorage.removeItem('st_'+id.replace('-','_'));
        });

        if(form && form.reset) form.reset();

        const toast = document.createElement('div');
        toast.textContent = 'Fiche soumise. Le formulaire a été réinitialisé.';
        toast.style.cssText='position:fixed;left:50%;transform:translateX(-50%);bottom:18px;background:#0f1c3f;color:#e7eeff;border:1px solid rgba(255,255,255,.2);padding:10px 14px;border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.3);z-index:9999';
        document.body.appendChild(toast);
        setTimeout(()=>toast.remove(),2200);
        window.scrollTo({top:0, behavior:"smooth"});
    } catch(e){}
}

// ---- Génération PDF ----
document.getElementById("steri-form").addEventListener("submit", async function(e){
    e.preventDefault();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageMargin = 10;
    const lineGap = 5; // plus compact
    const pageWidth = 190;

    // --- Titre ---
    doc.setFillColor(17, 84, 142);
    doc.rect(pageMargin, 12, pageWidth, 12, 'F');
    doc.setTextColor(255);
    doc.setFontSize(14); // titre plus petit
    doc.text("REGISTRE DE STÉRILISATION", pageMargin+5, 19);

    doc.setTextColor(0);
    doc.setFontSize(10); // texte général plus petit
    const date = `${document.getElementById('dateY').value}-${document.getElementById('dateM').value}-${document.getElementById('dateD').value}`;
    const code = document.getElementById('code').value || '';
    doc.text(`Date : ${date}`, pageMargin, 28);
    doc.text(`Code du stérilisateur : ${code}`, pageMargin, 36);

    // ---- Fonction pour écrire un bloc avec saut de page automatique ----
    function writeBlock(doc, label, value, startY){
        const normalized = (value || '').replace(/\r\n/g,'\n');
        const innerMargin = 4; // <-- marge intérieure
        const lines = doc.splitTextToSize(normalized, pageWidth - innerMargin*2);
        const blockHeight = 8 + lines.length * lineGap;

        if(startY + blockHeight > doc.internal.pageSize.getHeight() - 10){
            doc.addPage();
            startY = 10;
        }

        doc.setFillColor(245,245,245);
        doc.setDrawColor(200,200,200);
        doc.roundedRect(pageMargin, startY, pageWidth, blockHeight, 3, 3, 'FD');

        doc.setFontSize(9); // ou la taille que tu veux
        doc.setTextColor(0);
        doc.text(label + ":", pageMargin+innerMargin, startY + 6);
        doc.text(lines, pageMargin+innerMargin, startY + 12);

        return startY + blockHeight + 6;
    }


    // ---- Bloc texte principaux ----
    let currentY = 44;
    currentY = writeBlock(doc, "Type d’échec", document.getElementById('q1').value, currentY);
    currentY = writeBlock(doc, "DM rappelés", document.getElementById('dm').value, currentY);
    currentY = writeBlock(doc, "Résolution", document.getElementById('resolution').value, currentY);

    // ---- Tableau autoTable avec cases cochées ✓ ----
    const table = document.getElementById("grid");
    if(table){
        doc.setFont("helvetica");
        doc.autoTable({
            html: '#grid',
            startY: currentY + 10,
            theme: 'grid',
            headStyles: { fillColor: [17,84,142], textColor: 255, halign: 'center', fontSize: 9 },
            alternateRowStyles: { fillColor: [240,240,240] },
            styles: { fontSize: 8 },
            didParseCell: function(data){
                if(data.cell.raw && data.cell.raw.querySelector){
                    const cb = data.cell.raw.querySelector('input[type="checkbox"]');
                    if(cb) {
                        data.cell.text = cb.checked ? 'X' : ''; // <-- Met "X" au lieu de ✓
                    }
                }
            }
        });
        currentY = doc.lastAutoTable.finalY + 10;
    }

    // ---- Questions cycles non emballés ----
    for(let i=4;i<=9;i++){
        const qEl = document.getElementById('question-'+i);
        if(!qEl) continue;
        let label = `Question ${i}`;
        const labelEl = document.querySelector(`label[for="question-${i}"]`);
        if(labelEl) label = labelEl.textContent.trim().replace(/[:：\s]+$/,'');
        currentY = writeBlock(doc, label, qEl.value, currentY);
    }

    // ---- Sauvegarde PDF et réinitialisation ----
    doc.save("Registre_sterilisation.pdf");
    resetSterilForm();
});
