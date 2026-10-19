import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { cloudOfflineOutline, refreshOutline } from 'ionicons/icons';

@Component({
  selector: 'app-offline',
  templateUrl: './offline.page.html',
  styleUrls: ['./offline.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class OfflinePage {
  cargando: boolean = false;

  constructor() {
    addIcons({ cloudOfflineOutline, refreshOutline });
  }

  reintentarConexion() {
    this.cargando = true;
    setTimeout(() => {
      window.location.reload(); // Recarga la app para comprobar si regresó el internet
    }, 1000);
  }
}