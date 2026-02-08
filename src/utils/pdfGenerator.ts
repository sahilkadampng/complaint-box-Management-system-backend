import jsPDF from 'jspdf';

export interface ComplaintData {
    id: string;
    title: string;
    description: string;
    studentName: string;
    studentUsername: string;
    category: string;
    createdAt: string;
    status: string;
}

function maskText(text: string) {
    if (!text) return "";
    if (text.length <= 2) return "*".repeat(text.length);
    const visible = text.slice(-2);
    const hidden = "*".repeat(text.length - 2);
    return hidden + visible;
}

export const generateComplaintPDF = (complaint: ComplaintData) => {
    const doc = new jsPDF();
    const now = new Date();

    // ✅ Correct way to pass options
    const formattedDate = now.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
    });

    // Header
    doc.setFontSize(40);
    doc.setTextColor(151, 41, 40); // Primary blue color
    doc.text('DYPDPU', 20, 30);

    // Divider line
    doc.setDrawColor(30, 64, 175);
    doc.line(20, 35, 190, 35);

    // Complaint details
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('Complaint Details', 20, 50);

    doc.setFontSize(12);
    const details = [
        `Complaint ID: ${complaint.id}`,
        `Title: ${complaint.title}`,
        `Category: ${complaint.category}`,
        `Student Name: ${maskText(complaint.studentName)}`,
        `${formattedDate}`,
        `Status: ${complaint.status.toUpperCase()}`
    ];


    let yPosition = 65;
    details.forEach((detail) => {
        doc.text(detail, 20, yPosition);
        yPosition += 10;
    });

    // Description section
    doc.setFontSize(14);
    doc.text('Description:', 20, yPosition + 10);

    doc.setFontSize(12);
    // Split description into multiple lines if too long
    const splitDescription = doc.splitTextToSize(complaint.description, 170);
    doc.text(splitDescription, 20, yPosition + 25);

    // Footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(10);
    doc.setTextColor(128, 128, 128);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, pageHeight - 20);
    doc.text('DYPDPU Complaint Panel', 20, pageHeight - 10);

    // Save the PDF
    doc.save(`complaint-${complaint.id}.pdf`);
};