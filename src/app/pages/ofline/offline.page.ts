import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonButton, IonIcon, IonSpinner, ToastController } from '@ionic/angular/standalone';
import { Network } from '@capacitor/network';
import { addIcons } from 'ionicons';
import { cloudOfflineOutline, refreshOutline } from 'ionicons/icons';

@Component({
  selector: 'app-offline',
  templateUrl: './offline.page.html',
  styleUrls: ['./offline.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent, IonButton, IonIcon, IonSpinner]
})
export class OfflinePage implements OnInit, OnDestroy {

  private networkListener?: any;
  public estaComprobando: boolean = false;

  constructor(
    private router: Router,
    private toastController: ToastController
  ) {
    addIcons({ cloudOfflineOutline, refreshOutline });
  }

  async ngOnInit() {
    // Monitoreo en tiempo real por si el internet regresa solo
    this.networkListener = await Network.addListener('networkStatusChange', (status: any) => {
      if (status.connected) {
        this.regresarAlSistema();
      }
    });
  }

  ngOnDestroy() {
    if (this.networkListener) {
      this.networkListener.remove();
    }
  }

  async reintentarConexion() {
    this.estaComprobando = true;
    
    // Breve pausa para asegurar que el sistema procese la consulta de red
    await new Promise(resolve => setTimeout(resolve, 600));

    try {
      const status = await Network.getStatus();
      this.estaComprobando = false;

      if (status.connected) {
        this.regresarAlSistema();
      } else {
        this.mostrarAvisoSinRed();
      }
    } catch (error) {
      this.estaComprobando = false;
      this.mostrarAvisoSinRed();
    }
  }

  private regresarAlSistema() {
    // Valida inteligentemente a dónde debe ir según la sesión actual
    const sesionActiva = localStorage.getItem('userRol') !== null;
    const destino = sesionActiva ? '/dashboard' : '/login';
    
    this.router.navigate([destino], { replaceUrl: true });
  }

  private async mostrarAvisoSinRed() {
    const toast = await this.toastController.create({
      message: 'Aún no hay conexión a internet. Verifica tu red.',
      duration: 2500,
      position: 'bottom',
      color: 'dark',
      mode: 'ios'
    });
    await toast.present();
  }
}