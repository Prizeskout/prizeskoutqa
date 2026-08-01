import { AlignmentType, Document, Footer, Header, HeadingLevel, Packer, PageNumber, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import { getBranding } from "@/lib/brandingStore";
import { getReportIdentity } from "@/lib/reportIdentity";

export type WordReportSection = { title:string; paragraphs?:string[]; bullets?:string[]; table?:{headers:string[];rows:Array<Array<string|number|null|undefined>>}; note?:string };
export type WordReportInput = { title:string; subtitle?:string; fileName:string; summary?:Array<{label:string;value:string}>; sections:WordReportSection[]; limitations?:string[] };

const cell = (value:unknown,bold=false) => new TableCell({children:[new Paragraph({children:[new TextRun({text:value==null?"Not available":String(value),bold})]})]});
const reportTable = (headers:string[],rows:Array<Array<unknown>>) => new Table({width:{size:100,type:WidthType.PERCENTAGE},rows:[new TableRow({tableHeader:true,children:headers.map(value=>cell(value,true))}),...rows.map(row=>new TableRow({children:headers.map((_,index)=>cell(row[index]))}))]});

export async function saveWordReport(input:WordReportInput){
  const branding=getBranding();
  const identity=getReportIdentity();
  const children:Array<Paragraph|Table>=[
    new Paragraph({heading:HeadingLevel.TITLE,children:[new TextRun({text:input.title,bold:true,color:"0F172A"})]}),
    ...(input.subtitle?[new Paragraph({children:[new TextRun({text:input.subtitle,color:"475569"})]})]:[]),
    reportTable(["Report control","Value"],[["Report ID",identity.reportId],["Merchant ID",identity.merchantId],["Generated",identity.generatedAt],["Timezone",identity.timezone],["Status","System-generated draft for merchant review"]]),
    new Paragraph({spacing:{after:180}}),
  ];
  if(input.summary?.length){
    children.push(new Paragraph({heading:HeadingLevel.HEADING_1,text:"Control summary"}));
    children.push(reportTable(["Measure","Result"],input.summary.map(item=>[item.label,item.value])));
  }
  for(const section of input.sections){
    children.push(new Paragraph({heading:HeadingLevel.HEADING_1,text:section.title,pageBreakBefore:false}));
    for(const text of section.paragraphs??[]) children.push(new Paragraph({text,spacing:{after:120}}));
    for(const text of section.bullets??[]) children.push(new Paragraph({text,bullet:{level:0}}));
    if(section.table) children.push(reportTable(section.table.headers,section.table.rows));
    if(section.note) children.push(new Paragraph({children:[new TextRun({text:section.note,italics:true,color:"64748B"})],spacing:{before:120}}));
  }
  if(input.limitations?.length){
    children.push(new Paragraph({heading:HeadingLevel.HEADING_1,text:"Methodology and limitations"}));
    for(const text of input.limitations) children.push(new Paragraph({text,bullet:{level:0}}));
  }
  const doc=new Document({creator:branding.brandName,title:input.title,description:input.subtitle,sections:[{headers:{default:new Header({children:[new Paragraph({alignment:AlignmentType.RIGHT,children:[new TextRun({text:`${branding.brandName} | ${identity.reportId}`,bold:true,color:"EF681A"})]})]})},footers:{default:new Footer({children:[new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun("Confidential | "),new TextRun({children:["Page ",PageNumber.CURRENT," of ",PageNumber.TOTAL_PAGES]})]})]})},children}]});
  const blob=await Packer.toBlob(doc);
  const url=URL.createObjectURL(blob);
  const anchor=document.createElement("a");
  anchor.href=url;
  anchor.download=input.fileName.endsWith(".docx")?input.fileName:`${input.fileName}.docx`;
  anchor.click();
  setTimeout(()=>URL.revokeObjectURL(url),5000);
}
