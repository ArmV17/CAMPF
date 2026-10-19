import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { alertCircleOutline, homeOutline } from 'ionicons/icons';

@Component({
  selector: 'app-not-found',
  templateUrl: './not-found.page.html',
  styleUrls: ['./not-found.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class NotFoundPage {

  constructor(private router: Router) {
    addIcons({ alertCircleOutline, homeOutline });
  }

  irAlInicio() {
    this.router.navigate(['/dashboard'], { replaceUrl: true });
  }
}