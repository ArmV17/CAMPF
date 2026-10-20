import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonButton, IonIcon } from '@ionic/angular/standalone';
import { Network } from '@capacitor/network';
import { addIcons } from 'ionicons';
import { cloudOfflineOutline, refreshOutline } from 'ionicons/icons';

@Component({
  selector: 'app-offline',
  templateUrl: './offline.page.html',
  styleUrls: ['./offline.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent, IonButton, IonIcon]
})
export class OfflinePage {

  constructor(private router: Router) {
    addIcons({ cloudOfflineOutline, refreshOutline });
  }

  async reintentarConexion() {
    const status = await Network.getStatus();
    
    if (status.connected) {
      console.log('Conexión recuperada. Redirigiendo...');
      // Redirige al dashboard o login según consideres
      this.router.navigate(['/dashboard'], { replaceUrl: true });
    } else {
      // Opcional: podrías mostrar un toast sutil indicando que aún sigue sin internet
      console.warn('Aún sin conexión a la red.');
    }
  }
}