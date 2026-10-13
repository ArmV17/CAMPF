import { Injectable, EnvironmentInjector, runInInjectionContext } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { 
  Firestore, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  doc, 
  updateDoc, 
  deleteDoc, 
  setDoc,
  getDoc
} from '@angular/fire/firestore';
import { environment } from '../../environments/environment';
import * as CryptoJS from 'crypto-js';

@Injectable({
  providedIn: 'root'
})
export class AlmacenService {

  constructor(
    private firestore: Firestore,
    private http: HttpClient,
    private injector: EnvironmentInjector
  ) { }

  // ==========================================
  // SEGURIDAD Y CRIPTOGRAFÍA
  // ==========================================
  encriptarTexto(texto: string): string {
    return CryptoJS.AES.encrypt(texto, environment.llaveCifrado).toString();
  }

  desencriptarTexto(textoCifrado: string): string {
    const bytes = CryptoJS.AES.decrypt(textoCifrado, environment.llaveCifrado);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  hashearPassword(password: string): string {
    return CryptoJS.SHA256(password).toString();
  }

  async login(numEmpleado: string, passwordPlana: string) {
    return runInInjectionContext(this.injector, async () => {
      try {
        const docRef = doc(this.firestore, 'usuarios', numEmpleado);
        const snap = await getDoc(docRef);

        if (snap.exists()) {
          const user = snap.data();
          const passwordHasheada = this.hashearPassword(passwordPlana);

          if (user['password'] === passwordHasheada) {
            return { 
              exito: true, 
              rol: user['rol'], 
              nombre: this.desencriptarTexto(user['nombre']),
              en_linea: user['en_linea'] || false  
            };
          }
        }
        return { exito: false, mensaje: 'Credenciales incorrectas' };
      } catch (error) {
        console.error('Error en Login:', error);
        return { exito: false, mensaje: 'Error de conexión' };
      }
    });
  }

  async actualizarEstadoSesion(numEmpleado: string, estado: boolean) {
    return runInInjectionContext(this.injector, async () => {
      try {
        const docRef = doc(this.firestore, 'usuarios', numEmpleado);
        await updateDoc(docRef, { en_linea: estado });
      } catch (error) {
        console.error('Error actualizando el candado en Firebase:', error);
      }
    });
  }

  // ==========================================
  // DASHBOARD & DEVOLUCIONES
  // ==========================================
  async obtenerPrestamosDashboard() {
    return runInInjectionContext(this.injector, async () => {
      try {
        const colRef = collection(this.firestore, 'prestamos');
        const snapshot = await getDocs(colRef); 

        if (snapshot.empty) return [];

        const ahora = new Date();
        const ahoraMS = ahora.getTime();

        return await Promise.all(snapshot.docs.map(async (d) => {
          const data: any = d.data();
          let aluData = { nombre: data.receptor_nombre || 'Desconocido' };
          let correoProfesor = ''; 
          let deptoLimpio = data.autorizado_por_depto || 'CAMPF';

          if (deptoLimpio && deptoLimpio.startsWith('U2Fsd')) {
            try {
              deptoLimpio = this.desencriptarTexto(deptoLimpio);
            } catch (e) { }
          }

          try {
            if (data.autorizado_por_id) {
              const profSnap = await getDoc(doc(this.firestore, 'maestros', data.autorizado_por_id));
              if (profSnap.exists()) {
                const profData: any = profSnap.data();
                correoProfesor = profData.correo || '';
              }
            }
          } catch (e) { }

          try {
            if (data.receptor_id) {
              const aluSnap = await getDoc(doc(this.firestore, 'alumnos', data.receptor_id));
              if (aluSnap.exists()) {
                const tempAlu: any = aluSnap.data();
                try { tempAlu.nombre = this.desencriptarTexto(tempAlu.nombre); } catch (e) { }
                aluData = tempAlu;
              }
            }
          } catch (e) { }

          let estadoVisual = data.estado;
          if (data.estado !== 'Devuelto' && data.fecha_devolucion_pactada) {
            const fechaPactada = data.fecha_devolucion_pactada.toDate();
            const fechaLimite = new Date(fechaPactada.getFullYear(), fechaPactada.getMonth(), fechaPactada.getDate(), 15, 0, 0, 0);
            estadoVisual = ahoraMS > fechaLimite.getTime() ? 'Vencido' : 'Activo';
          }

          return { 
            id: d.id, 
            ...data, 
            autorizado_por_depto: deptoLimpio, 
            autorizado_por_correo: correoProfesor, 
            estado: estadoVisual,
            alumnos: aluData
          };
        }));
      } catch (error) {
        console.error("Error en dashboard:", error);
        return [];
      }
    });
  }

  async obtenerTodosLosPrestamosActivos() {
    return runInInjectionContext(this.injector, async () => {
      try {
        const colRef = collection(this.firestore, 'prestamos');
        const q = query(colRef, where('estado', '==', 'Activo'));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (e) {
        console.error("Error obteniendo todos los préstamos:", e);
        return [];
      }
    });
  }

  async contarPrestamosActivos(identificador: string): Promise<number> {
    return runInInjectionContext(this.injector, async () => {
      try {
        const prestamosRef = collection(this.firestore, 'prestamos');
        const q = query(
          prestamosRef, 
          where('receptor_id', '==', identificador), 
          where('estado', '==', 'Activo')
        );
        const snap = await getDocs(q);
        return snap.size;
      } catch (e) {
        console.error("Error al contar préstamos:", e);
        return 0;
      }
    });
  }

  async registrarDevolucion(idPrestamo: string, idHerramienta: string) {
    return runInInjectionContext(this.injector, async () => {
      try {
        await updateDoc(doc(this.firestore, 'prestamos', idPrestamo), {
          estado: 'Devuelto',
          fecha_devolucion: new Date()
        });

        await updateDoc(doc(this.firestore, 'inventario', idHerramienta), {
          estado: 'Disponible',
          prestada: false,
          usuario_prestamo: ""
        });

        return { exito: true };
      } catch (e) {
        return { exito: false };
      }
    });
  }

  // ==========================================
  // ALUMNOS (Actualizado con teléfono)
  // ==========================================
  async registrarAlumno(alumno: any) {
    return runInInjectionContext(this.injector, async () => {
      try {
        await setDoc(doc(this.firestore, 'alumnos', alumno.matricula), {
          matricula: alumno.matricula,
          nombre: this.encriptarTexto(alumno.nombre),
          carrera: alumno.carrera,
          correo: alumno.correo,
          telefono: alumno.telefono || '' // 👈 Guardando teléfono
        });
        return { exito: true };
      } catch (e: any) {
        return { exito: false, mensaje: e.message };
      }
    });
  }

  async obtenerAlumnos() {
    return runInInjectionContext(this.injector, async () => {
      const snapshot = await getDocs(collection(this.firestore, 'alumnos'));
      return snapshot.docs.map(d => {
        const data: any = d.data();
        try { data.nombre = this.desencriptarTexto(data.nombre); } catch (e) {}
        return { ...data, correo: data.correo || data.nivel || data.grado || 'Sin correo', telefono: data.telefono || '' };
      });
    });
  }

  async buscarAlumnoPorMatricula(matricula: string) {
    return runInInjectionContext(this.injector, async () => {
      try {
        const q = query(collection(this.firestore, 'alumnos'), where('matricula', '==', matricula));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const data: any = querySnapshot.docs[0].data();
          try {
            if (data.nombre) {
              data.nombre = this.desencriptarTexto(data.nombre);
            }
          } catch (e) { }
          return data; 
        }
        return null;
      } catch (error) {
        console.error("Error buscando alumno:", error);
        return null;
      }
    });
  }

  async cargarAlumnosMasivo(listaAlumnos: any[]): Promise<{ exitosos: number, fallidos: number }> {
    return runInInjectionContext(this.injector, async () => {
      let exitosos = 0;
      let fallidos = 0;

      for (const alumno of listaAlumnos) {
        try {
          await setDoc(doc(this.firestore, 'alumnos', alumno.matricula.toString()), {
            matricula: alumno.matricula.toString(),
            nombre: this.encriptarTexto(alumno.nombre),
            carrera: alumno.carrera || 'No especificada',
            correo: alumno.correo || 'sin_correo@utc.edu.mx',
            telefono: alumno.telefono || ''
          });
          exitosos++;
        } catch (error) {
          fallidos++;
        }
      }
      return { exitosos, fallidos };
    });
  }

  // ==========================================
  // MAESTROS (Actualizado con teléfono)
  // ==========================================
  async obtenerMaestros() {
    return runInInjectionContext(this.injector, async () => {
      try {
        const snapshot = await getDocs(collection(this.firestore, 'maestros'));
        return snapshot.docs.map(d => {
          const data: any = d.data();
          
          try { 
            if (data.nombre) {
              data.nombre = this.desencriptarTexto(data.nombre); 
            }
            if (data.departamento) {
              try {
                data.departamento = this.desencriptarTexto(data.departamento).trim().toUpperCase();
              } catch { }
            }
          } catch (e) { }
          
          return { 
            id: d.id, 
            ...data,
            num_maestro: data.num_maestro,
            departamento: data.departamento || 'SIN ÁREA',
            telefono: data.telefono || ''
          };
        });
      } catch (error) {
        console.error("Error al obtener maestros:", error);
        return [];
      }
    });
  }

  async registrarMaestro(maestro: any) {
    return runInInjectionContext(this.injector, async () => {
      try {
        await setDoc(doc(this.firestore, 'maestros', maestro.numMaestro), {
          num_maestro: maestro.numMaestro,
          nombre: this.encriptarTexto(maestro.nombre),
          correo: maestro.correo,
          telefono: maestro.telefono || '', // 👈 Guardando teléfono
          materias: maestro.materias,
          departamento: this.encriptarTexto(maestro.departamento || 'SIN AREA')
        });
        return { exito: true };
      } catch (e: any) {
        return { exito: false, mensaje: e.message };
      }
    });
  }

  // ==========================================
  // EMPLEADOS / TRABAJADORES
  // ==========================================
  async obtenerEmpleados() {
    return runInInjectionContext(this.injector, async () => {
      const snapshot = await getDocs(collection(this.firestore, 'usuarios'));
      return snapshot.docs.map(d => {
        const data: any = d.data();
        try { data.nombre = this.desencriptarTexto(data.nombre); } catch (e) {}
        return { 
          id: d.id, 
          ...data,
          departamento: data.departamento || '',
          correo: data.correo || '',
          telefono: data.telefono || ''
        };
      });
    });
  }

  async registrarEmpleado(empleado: any) {
    return runInInjectionContext(this.injector, async () => {
      try {
        const dataParaGuardar: any = {
          num_empleado: empleado.numEmpleado,
          nombre: this.encriptarTexto(empleado.nombre),
          password: this.hashearPassword(empleado.password),
          rol: empleado.rol,
          en_linea: false,
          departamento: empleado.rol === 'Trabajador' ? empleado.departamento : '',
          correo: empleado.rol === 'Trabajador' ? empleado.correo : '',
          telefono: empleado.rol === 'Trabajador' ? empleado.telefono : ''
        };

        await setDoc(doc(this.firestore, 'usuarios', empleado.numEmpleado), dataParaGuardar);
        return { exito: true };
      } catch (e: any) {
        return { exito: false, mensaje: e.message };
      }
    });
  }

  // ==========================================
  // INVENTARIO
  // ==========================================
  async obtenerInventario() {
    return runInInjectionContext(this.injector, async () => {
      const colRef = collection(this.firestore, 'inventario');
      const snapshot = await getDocs(colRef);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    });
  }

  async obtenerTiposDeHerramientas() {
    return runInInjectionContext(this.injector, async () => {
      try {
        const snapshot = await getDocs(collection(this.firestore, 'inventario'));
        const herramientas = snapshot.docs.map(doc => doc.data() as any);
        return [...new Set(herramientas.map(h => h.tipo_herramienta).filter(t => t))];
      } catch (e) {
        return [];
      }
    });
  }

  async registrarHerramienta(herramienta: any) {
    return runInInjectionContext(this.injector, async () => {
      try {
        await setDoc(doc(this.firestore, 'inventario', herramienta.codigo), {
          num_herramienta: herramienta.codigo,
          nombre_herramienta: herramienta.nombre,
          tipo_herramienta: herramienta.tipo,
          estado: herramienta.estado || 'Disponible' 
        });
        return { exito: true };
      } catch (e: any) {
        return { exito: false, mensaje: e.message };
      }
    });
  }

  // ==========================================
  // PRÉSTAMOS
  // ==========================================
  async registrarNuevoPrestamoDetallado(datos: any) {
    return runInInjectionContext(this.injector, async () => {
      try {
        const prestamosRef = collection(this.firestore, 'prestamos');
        const nombreEmpleadoSesion = localStorage.getItem('userName') || 'Admin';
        const numEmpleadoSesion = localStorage.getItem('numEmpleado') || '0000';

        let correoFinal = datos.receptor.correo;

        if (!correoFinal && datos.receptor.id) {
          const coleccionNombre = datos.esProfesor ? 'maestros' : 'alumnos';
          const userDoc = await getDoc(doc(this.firestore, coleccionNombre, datos.receptor.id));
          if (userDoc.exists()) {
            const userData = userDoc.data() as any;
            correoFinal = userData.correo;
          }
        }

        const fechaBase = new Date(datos.fechaEntrega);
        const fechaCorregida = new Date(
          fechaBase.getUTCFullYear(),
          fechaBase.getUTCMonth(),
          fechaBase.getUTCDate(),
          15, 0, 0 
        );

        const nombreHerramientaFull = datos.herramienta.tipo_herramienta 
          ? `${datos.herramienta.nombre_herramienta} (${datos.herramienta.tipo_herramienta})`
          : datos.herramienta.nombre_herramienta;

        const docData = {
          receptor_id: datos.receptor.id,
          receptor_nombre: datos.receptor.nombre,
          receptor_correo: correoFinal || 'sin_correo@utc.edu.mx',
          receptor_tipo: datos.esProfesor ? 'Profesor' : 'Alumno',
          receptor_info_extra: datos.receptor.info_extra || '',
          autorizado_por_nombre: datos.autorizador.nombre,
          autorizado_por_id: datos.autorizador.num_empleado,
          autorizado_por_depto: datos.autorizador.departamento || 'CAMPF',
          materia: datos.materia || 'General',
          herramienta_id_db: datos.herramienta.id || datos.herramienta.num_herramienta, 
          herramienta_codigo: datos.herramienta.num_herramienta,
          herramienta_nombre: nombreHerramientaFull,
          fecha_prestamo: new Date(),
          fecha_devolucion_pactada: fechaCorregida,
          empleado_almacen: nombreEmpleadoSesion,
          empleado_almacen_id: numEmpleadoSesion,
          estado: 'Activo'
        };

        await addDoc(prestamosRef, docData);

        const herramientaDocId = datos.herramienta.id || datos.herramienta.num_herramienta;
        await updateDoc(doc(this.firestore, 'inventario', herramientaDocId), {
          prestada: true,
          estado: 'Prestado',
          usuario_prestamo: datos.receptor.id
        });

        return { exito: true };
      } catch (e) {
        console.error("Error crítico en préstamo:", e);
        return { exito: false };
      }
    });
  }

  // ==========================================
  // GOOGLE SCRIPT (ALERTAS)
  // ==========================================
  async enviarAlertasMasivas(lista: any[]) {
    const url = environment.urlGoogleScript;
    const payload = {
      accion: "enviar_manual",
      lista_contactos: lista
    };

    return await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify(payload)
    });
  }

  // ==========================================
  // GESTIÓN GENERAL
  // ==========================================
  async eliminarRegistro(coleccion: string, id: string) {
    return runInInjectionContext(this.injector, async () => {
      try {
        await deleteDoc(doc(this.firestore, coleccion, id));
        return { exito: true };
      } catch (e: any) {
        return { exito: false, mensaje: e.message };
      }
    });
  }
}