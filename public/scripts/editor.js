// scripts/editor.js

// تحميل القالب من الرابط
const params = new URLSearchParams(window.location.search);
const templateName = params.get("template");

fetch(`templates/${templateName}.html`)
  .then(res => res.text())
  .then(html => {
    document.getElementById("editor-container").innerHTML = html;
  })
  .catch(err => {
    document.getElementById("editor-container").innerHTML = "⚠️ حدث خطأ أثناء تحميل القالب.";
  });

// تحميل PDF
function downloadPDF() {
  const element = document.getElementById("editor-container");
  html2pdf().from(element).save("CV.pdf");
}




















 async function downloadPDF() {
      const element = document.getElementById("cv");
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true
      });

      const imgData = canvas.toDataURL("image/jpeg", 1.0);
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF("p", "mm", "a4");

      const pageWidth = 210;
      const pageHeight = 297;

      const imgProps = pdf.getImageProperties(imgData);
      const imgWidth = pageWidth;
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

      let position = 0;
      let heightLeft = imgHeight;

      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save("Samira_Jadid_CV.pdf");
    }

    interact('.draggable').draggable({
      listeners: {
        move(event) {
          const target = event.target;
          const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
          const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

          target.style.transform = `translate(${x}px, ${y}px)`;
          target.setAttribute('data-x', x);
          target.setAttribute('data-y', y);
        }
      }
    });

    function addNewSection() {
      const main = document.querySelector('.cv main');
      const section = document.createElement('div');
      section.className = 'section draggable';
      section.setAttribute('draggable', 'true');
      section.innerHTML = `
        <h3 contenteditable="true">قسم جديد</h3>
        <div contenteditable="true">محتوى جديد هنا...</div>
      `;
      main.appendChild(section);

      interact(section).draggable({
        listeners: {
          move(event) {
            const target = event.target;
            const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
            const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

            target.style.transform = `translate(${x}px, ${y}px)`;
            target.setAttribute('data-x', x);
            target.setAttribute('data-y', y);
          }
        }
      });
    }