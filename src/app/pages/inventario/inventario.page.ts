import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { 
  IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, 
  IonButton, IonIcon, IonSearchbar, IonContent, IonAccordionGroup, 
  IonAccordion, IonItem, IonLabel 
} from '@ionic/angular/standalone';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx'; // 🚀 IMPORTACIÓN DE LA LIBRERÍA EXCEL

import { addIcons } from 'ionicons';
import { 
  constructOutline, barcodeOutline, searchOutline, fingerPrintOutline, 
  hammerOutline, chevronDownOutline, chevronUpOutline, chevronDownCircle,
  chevronUpCircle, cloudUploadOutline, imageOutline, cameraOutline, downloadOutline,
  documentTextOutline
} from 'ionicons/icons';
import { AlmacenService } from '../../services/almacen.service';

@Component({
  selector: 'app-inventario',
  templateUrl: './inventario.page.html',
  styleUrls: ['./inventario.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, 
    IonButton, IonIcon, IonSearchbar, IonContent, IonAccordionGroup, 
    IonAccordion, IonItem, IonLabel
  ]
})
export class InventarioPage {

  herramientasOriginales: any[] = [];
  herramientasAgrupadas: any[] = [];
  inventarioFiltrado: any[] = []; 
  textoBuscar: string = '';

  constructor(private almacenService: AlmacenService) {
    addIcons({ 
      constructOutline, barcodeOutline, searchOutline, fingerPrintOutline, 
      hammerOutline, chevronDownOutline, chevronUpOutline, chevronDownCircle,
      chevronUpCircle, cloudUploadOutline, imageOutline, cameraOutline, downloadOutline,
      documentTextOutline
    });
  }

  async ionViewWillEnter() {
    await this.cargarInventario();
  }

  async cargarInventario() {
    this.herramientasOriginales = await this.almacenService.obtenerInventario();
    this.procesarInventario();
    this.inventarioFiltrado = [...this.herramientasAgrupadas]; 
  }

  procesarInventario() {
    const mapa = new Map();
    this.herramientasOriginales.forEach(h => {
      const nombre = h.nombre_herramienta;
      const tipo = h.tipo_herramienta || 'Normal';

      if (!mapa.has(nombre)) {
        mapa.set(nombre, {
          nombre: nombre,
          totalDisponibles: 0,
          imagenAI: h.url_imagen || 'assets/ai_icon.png',
          detallesPorTipo: [] 
        });
      }

      const grupo = mapa.get(nombre);
      let subGrupo = grupo.detallesPorTipo.find((t: any) => t.tipo === tipo);
      
      if (!subGrupo) {
        subGrupo = { tipo: tipo, disponibles: 0, items: [] };
        grupo.detallesPorTipo.push(subGrupo);
      }

      subGrupo.items.push({
        num_herramienta: h.num_herramienta,
        estado: h.estado || 'Disponible'
      });

      if (h.estado === 'Disponible') {
        subGrupo.disponibles++;
        grupo.totalDisponibles++;
      }
    });
    this.herramientasAgrupadas = Array.from(mapa.values());
  }

  buscarHerramienta(event: any) {
    const t = (event.detail.value || '').toLowerCase().trim();
    this.textoBuscar = t;

    if (!t) {
      this.inventarioFiltrado = this.herramientasAgrupadas;
      return;
    }

    this.inventarioFiltrado = this.herramientasAgrupadas.reduce((resultados, grupo) => {
      const coincideNombre = grupo.nombre.toLowerCase().includes(t);
      const nuevoGrupo = { ...grupo, detallesPorTipo: [] as any[] };
      let hayCoincidenciaInterna = false;

      grupo.detallesPorTipo.forEach((detalle: any) => {
        const nombreYTipo = `${grupo.nombre} ${detalle.tipo}`.toLowerCase();
        const coincideNombreTipo = nombreYTipo.includes(t);
        const itemsPorEstado = detalle.items.filter((item: any) => item.estado.toLowerCase().includes(t));

        if (coincideNombreTipo || itemsPorEstado.length > 0) {
          nuevoGrupo.detallesPorTipo.push({
            ...detalle,
            items: itemsPorEstado.length > 0 ? itemsPorEstado : detalle.items,
            disponibles: detalle.items.filter((i: any) => i.estado.toLowerCase() === 'disponible').length
          });
          hayCoincidenciaInterna = true;
        }
      });

      if (coincideNombre && !hayCoincidenciaInterna) {
        resultados.push(grupo);
      } else if (hayCoincidenciaInterna) {
        nuevoGrupo.totalDisponibles = nuevoGrupo.detallesPorTipo.reduce((acc: number, det: any) => acc + det.disponibles, 0);
        resultados.push(nuevoGrupo);
      }
      return resultados;
    }, []);
  }

  trackByNombre(index: number, item: any) {
    return item.nombre;
  }

  configurarCabeceraPDF(doc: any, titulo: string, usuario: string) {
    const pageWidth = doc.internal.pageSize.getWidth(); 
    
    const fechaActual = new Date();
    const fechaHora = fechaActual.toLocaleDateString('es-MX') + ' ' + 
                      fechaActual.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

    const logoIzquierdoBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAhYAAAHTCAYAAAB7ilFJAAAQAElEQVR4AexdBaBWRfY/M7e+fEF3iiIhiiA2IigG2GK7NiYWiu2zi1BQEDCxwUaxxU4wUKS76+VXt2b+v3MR13Vdd//r4oL7Lvd8c+/EmTNnzpxz5sz3PiTVXrUc+AccGDt2rHXIIaeli5ptu0uDVp3Obrbdzrc32abzbXWab3tJgxbb7XHKKReVrF6tk9OmaYtqr1oO1HKglgO1HKjlADhQ61iACbX333Jg3rx5zimDLmt36dW3XPXx1x996uVzHwRBcG9NdfWlNTWZS33Pv72iqvrdyW9Nmb9d59aT+x267bWpek17DbvvoeYzliwpnTdPO3+LsfbtlxzQWhtTp041p61cmZg9e3Z6wYIFxeB7/e8WLmz47fz5Db6bP7/5rFmLWjEsWrWq1dezZrVatGhV9M55vwqLNtafhXThypUtv5g5s9F33y1s+NW8efWnAf+3366udQJ/ORG177Uc2OI5sPURWOtYbH1ztlkpvvyam7brvtd+V7307HNvWJZ9nVK6YzqVdsIwNGAMTSmlZRiGVVxcbMPZqCsN2UtY1rW2FXvnxhtu/LTXHn0m7LRnq8uKG7bo/dGX32739mffNZw5c6a9WYneQpGz4zB16tclX3wxs9HbH37ZZuq0Ge3f/WzGzhSvs2udxu0GHnXSWefu13W3G3btuf/wbrvvM7b7Xvs+v9euPaf03L3XlD1332farj33mgOYu922neb12mf/+V126TZ/t332nt9z/z5RunuvnvN277nXvL323WfeLnvsNm/X7rvN3W3vPed23anH3C47dPvugP0OfrvXAfu+2rf3Qc/27N5zTM/9dr+j1wGtBtVt1v6IRFHz7q9Pnb7NZ5ifiRMn/k/OzxYqNrVk1XJgq+dArWOx1U/hf2YAbFwuu/rmYx55dMIEEvJqKczWSikJZ4J834/ANE2yLIuQT5wvTYMY4HRwuXAcpynq9rNN6yZpWG8c3P+wl4867NBRe/c5dPB+Bxx50LMvvbXTc6+/3njatGl/qqMT8C4+ZcoH9V+YMqXtcy9P2XXQJVf1LqrX5Ph+R55w0VEnHHHLPgfuf98RRx31TP8D+00++sijPi1KF3/kB/69vhfcIwxrsLScM6QVO0aasT0NO9ZVWM7OhhVrgDxbGLZVv1FT07Tjhq8EXLqYkcl7RoBny0mYSlqmsGIoj5lkOlYskbKKSkoty4mllaaOisydXS/Y27Ts46RtnmfZsaFK6+ecRPKzY4499rmDDjv83jPOu+zynvv26//qq1N3nDjx9Tr/GYmqxVLLgS2TA7VUbX4OyM3fRW0PWzoHyoYPr3PW+YOvGPvgg8NdP9jF9wIDkQkyLJOEMMgwLEokYiSEjpwKy7Iix4IdjDBQ5Ho+xRNJ0iQoEU/iU1Ih7xqpZHpb0zKPdgPvlq9mfD3p/AvPf3TgX84esf/Bh1836NIrT3rgkad6P/DAhE6lbdoU01ZylZVNNV944bVWDz765G5jH37ssKat2p1y/KkDy44+fsAdp5xy9n1nnzvoiacmTnxek3zMiSfuUCTPcZzY4YlEcmdpGNsUPBe23TGceEzEEnGC8acQY/+tNJPPU8H1KFlURKZlk5NIUCyeoHzBjdoHIdwHK0YkTMqjXhCid8yZkCaFQGzYNsWTCSp4AeZIkh1LkOt7MpaI7eCHwVF2zLnx+9mznz7uL395aOAFA28vrtPs9HMGXbEzHCaDaq+thgMTJkxIPvjgS+knn3yp4fgJT28/9sln2z8+8cUORwz4yx7FDVrsl6zbpE9xwxZ96jZp16e4bps+ybot8M5pkz5OcZP9evc9aq9xjzzb8clnJ7e/b/zT2z/wxHMtJ058q5hx8vetthpG1BL6X+eA/K9TUEvAf5UDZWXD69xy/R23k2FealtWEzgDBKPHhieiSwhBQRAQOxGFQoEY+B2RCTJNk2wYLQuOBuflcjmqqamJ2pWWllJ5eTmFYUiO46A9JTzX6+yp8BjTsK955ulJo6+44or7r77+xntlLhzeoEmbstuG3nPW0BFjD7t79Pgdbr/97hZlZWX/dfksGzGiZPi94zrecvuIg/v2P+KiYXcff+cRxx87fMiQq0defsU1Y2qyhfHpdPHgWCJ1Cvixfz7vtgmULoonUxI8k+CNQHRHZHM5gWdKJpPEfEIZ5eEwaAHbrSUpwlB/TAUZtClfmjQA8y/rP/8u27e7/H/5sH32z2x6LzQAAIABJREFU3w/c8/j2d7+tV+069n31x4d2rFm19J26H1et+t/K/2/5m20/bv/063Xr1v24/tO1H7/39uJ/f2H4s88P/u6v6Zk/X7N27dqfNqxb+9OmH374sX7d2k0P//Of3x87//0v1v+0ft1PWzZt2rx1y+bN/1r/4w/L1n78wcq//2P0iHGTx5x01jlnzN//m90PvfKGGX+ZOHbsnBNOO23G8WefecbxE8ZNveCq6y/MOfDAA/dYffH595015bTTxsyec+Xlp86YefnsqVOnjpo6dephb77x6owHH31w+Euvvfz76dO/P2XevHnXzZw585aZ18+8/cYbb7xp5qzpM2666aY5d99991U33HjdzXfffefvbr/jtrtmXH31lTfcddd1N991000/vvP+u2//8yvPPXHHM08+c8czzz1598uvPXfvy68/d88TTzzx3NNPP/f48y+88OgLL7z0+NPPPfPkH5979vkXXnjh+RdeeO7Jl19+6dFXXnnp8Vdfe/Gxl195/uEXn3/y0ddef/nRN15/9bE3Xn/1kX9+9eXHXnr5+YdeePHZ+19+6Zl7X33pyfuff/rRB1987rH7nn3qwXufevyh+196+clHX3r+yXuee/qu++/6w6133XXXpTfddFNm1qxZmdmzZ+cuv/zyxJVXXim+99572b/85S+xN954I/nKK68k33jjjcS//vWv+A8//BB75ZVXEm+99VbihRdeSD7//POJp59+Ov7kk08mHnvssfjjjz8ee/zxx2OPP/547PHHH489/vjj8cceeyzx+OOPxx977LEkn8tJ1157rTr1hBMyxwwc2Lpbt27N6jZsaFSjRo2a9erVq9OgQYMaNWvWrFm/fv3qDRo0iNWtW7dG7dq1Y9WrV49VrVq1Rk2vXp2aNWvWqFOnTo2aNWvWqFGjRo3q1avXqFatWo1q1arVqFatWo1q1arVqFatWo1atWrVqFmzZg1+9k+1atVqVK9evUaDBg1q1KxZs0bVqlVr1KxZs0b16tVr1K1bt0a9evX4Z121atVq1K1bt0atWrX+A/vR22k28P+8AAAAAElFTkSuQmCC';
    const logoDerechoBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIIAAAChCAYAAAALO2dlAAAABHNCSVQICAgIfAhkiAAAAL56VFh0UmF3IHByb2ZpbGUgdHlwZSBBUFAxAAAYlX1PQQ4DIQi8+4p9wgiK+hzT7DabNG2z/z8UorZr03SIgBNgwF3X+3rsl+V5PLb9trrFQIALJRSqADIaGPAEb1F9Q4/sNdMmpP6nFqXkhHCqq5gQtUJYfNLXGsyVNicMWSY1nVHxSxu25Ekj09h35uuoj19834lQg91AY864u0M8ZyFOnCxjYWbjzEcutuF/6yJNlz73RdLu3Ln5bv/uU7gXDZpWL56SRhMAACAASURBVHic7L15nJxVlT7+3PuutS9dXb13J91ZOivZV0ggC0pAEARlkZnPuAwqOOrXDXUYxRlcxlFUZkQQYUZHNgM6DmAgIoEQEoTse3cnnd67q7u6u9a33u3e3x9Vb3WlSSSs6cyPw+el0lXvct9zn3vOueeecy7wHr1H79F79B69R+/Re/QevUenIXK2G/BO0IYNG2aoqjQFgN3T0w3bZkJFRXnnE088vR8ABwBCCD+7rZxY9H8KCLIsT62qqrq6trbmOts2JwcCQVvXDQwMDAihUKCjoqJ62/PPP889Ho/p8Xg2uVyu46Ioxl555ZX46907HA77/X7/5KamptSzzz57/N14n3eTzmkgXHPNNYGqqir14YcfXkYIXyzLyoZkMjGfMQ5FURAMBjB79mwEg0EcPnwY3d096O8fQDRaDtu24yMjo4mZM5sPer3+58vLy7f+5Cc/aa2rqxMLt2cdHR3SBz/4wVWMsYZjx47NzeVyq8rLy+PXXnvtb5cuXXr/9ddfP3BWGfA20jkLhM997ub3vfjiS5+zLCPU1dUz3bLMEKUCMpkMJEmEpumQJBkXX7wO8+fPR2/w/bNdSOcRSKRTX1KBpQbvs9Hn/WyqyHubt5rH6+nrd4/H/rYv+n/A+7OWeA29b1nAAAAAElFTkSuQmCC';

    try {
      doc.addImage(logoIzquierdoBase64, 'PNG', 15, 10, 24, 24); 
      doc.addImage(logoDerechoBase64, 'PNG', pageWidth - 37, 10, 22, 22); 
    } catch (e) {
      console.warn('Error al cargar los logos.');
    }

    doc.setTextColor(0, 0, 0); 
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12); 
    doc.text('Universidad Autónoma Agraria Antonio Narro', pageWidth / 2, 14, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text('DIVISIÓN DE INGENIERÍA', pageWidth / 2, 19, { align: 'center' });
    doc.text('DEPARTAMENTO DE CIENCIAS DEL SUELO', pageWidth / 2, 23, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8); 
    doc.text('Calzada Antonio Narro No. 1923, Colonia Buenavista', pageWidth / 2, 28, { align: 'center' });
    doc.text('Saltillo, Coahuila, México. C.P. 25315', pageWidth / 2, 32, { align: 'center' });
    doc.text('Tel. (844) 411 02 00 Ext. 1936, 1937', pageWidth / 2, 36, { align: 'center' });
    doc.text('e-mail: suelos@uaaan.edu.mx   Página Web: www.uaaan.edu.mx', pageWidth / 2, 40, { align: 'center' });

    doc.setLineWidth(0.5);
    doc.line(15, 43, pageWidth - 15, 43);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(titulo, pageWidth / 2, 52, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80); 
    doc.text(`${usuario}`, pageWidth - 15, 48, { align: 'right' });
    doc.text(`${fechaHora}`, pageWidth - 15, 52, { align: 'right' });
  }
  
  generarPDFInventario() {
    const doc = new jsPDF('p', 'mm', 'a4'); 
    const hoy = new Date().toLocaleDateString('es-MX');
    const empleadoActual = localStorage.getItem('userName') || 'Admin';

    this.configurarCabeceraPDF(doc, 'REPORTE DE INVENTARIO', empleadoActual);

    const cuerpoTabla: any[] = [];
    this.herramientasAgrupadas.forEach((herramienta: any) => {
      herramienta.detallesPorTipo.forEach((detalle: any) => {
        const nombreCompleto = (detalle.tipo && detalle.tipo.trim() !== '' && detalle.tipo.trim().toLowerCase() !== 'normal') 
                       ? `${herramienta.nombre} ${detalle.tipo}` 
                       : herramienta.nombre;
          
        cuerpoTabla.push([nombreCompleto, detalle.items.length]);
      });
    });

    autoTable(doc, {
      head: [['Herramienta', 'Cantidad']],
      body: cuerpoTabla,
      startY: 58, 
      margin: { top: 15, left: 15, right: 15 }, 
      theme: 'striped',
      styles: { fontSize: 9, halign: 'center', cellPadding: 3 }, 
      headStyles: { fillColor: [0, 0, 0] }
    });

    doc.save(`Reporte_Inventario_${hoy.replace(/\//g, '-')}.pdf`);
  }

  // =====================================
  // 🚀 NUEVA FUNCIÓN: EXPORTAR A EXCEL (.xlsx)
  // =====================================
  generarExcelInventario() {
    const hoy = new Date().toLocaleDateString('es-MX').replace(/\//g, '-');
    
    // Aquí construiremos los datos fila por fila
    const datosParaExcel: any[] = [];

    // Recorremos el inventario para desglosar cada herramienta y tener un reporte súper detallado
    this.herramientasAgrupadas.forEach((herramienta: any) => {
      herramienta.detallesPorTipo.forEach((detalle: any) => {
        detalle.items.forEach((unidad: any) => {
          
          datosParaExcel.push({
            'Herramienta': herramienta.nombre,
            'Categoría / Tipo': (detalle.tipo === 'Normal' || !detalle.tipo) ? 'Sin tipo' : detalle.tipo,
            'Código (ID)': unidad.num_herramienta,
            'Estado Actual': unidad.estado
          });

        });
      });
    });

    // Convierte nuestros datos (JSON) a una hoja de Excel
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(datosParaExcel);
    
    // Crea el libro de Excel (archivo)
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    
    // Adjuntamos nuestra hoja al libro
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventario Detallado');

    // Descarga automática en el navegador
    XLSX.writeFile(workbook, `Reporte_Inventario_Detallado_${hoy}.xlsx`);
  }
}