import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Función para normalizar capitalización
const normalizeCapitalization = (text) => {
  if (!text) return '';

  // Convertir todo a minúsculas primero
  let normalized = text.toLowerCase();

  // Capitalizar la primera letra del texto
  normalized = normalized.charAt(0).toUpperCase() + normalized.slice(1);

  // Capitalizar después de cada punto seguido de espacio
  normalized = normalized.replace(/\.\s+(.)/g, (match, char) => {
    return '. ' + char.toUpperCase();
  });

  // Capitalizar después de cada salto de línea
  normalized = normalized.replace(/\n(.)/g, (match, char) => {
    return '\n' + char.toUpperCase();
  });

  return normalized;
};

async function normalizarTodasLasTareas() {
  console.log('🔄 Iniciando normalización de todas las tareas...\n');

  try {
    // 1. Obtener todas las tareas
    const { data: tareas, error: fetchError } = await supabase
      .from('tareas')
      .select('id, nombre_tarea, descripcion_tarea')
      .order('id', { ascending: true });

    if (fetchError) {
      console.error('❌ Error al obtener tareas:', fetchError);
      return;
    }

    if (!tareas || tareas.length === 0) {
      console.log('ℹ️  No hay tareas para normalizar');
      return;
    }

    console.log(`📊 Total de tareas encontradas: ${tareas.length}\n`);

    let tareasModificadas = 0;
    let tareasSinCambios = 0;

    // 2. Normalizar cada tarea
    for (const tarea of tareas) {
      const nombreOriginal = tarea.nombre_tarea;
      const descripcionOriginal = tarea.descripcion_tarea;

      const nombreNormalizado = normalizeCapitalization(nombreOriginal);
      const descripcionNormalizada = normalizeCapitalization(descripcionOriginal);

      // Verificar si hubo cambios
      const huboCambios = nombreOriginal !== nombreNormalizado ||
                          descripcionOriginal !== descripcionNormalizada;

      if (huboCambios) {
        console.log(`🔧 Tarea ID ${tarea.id}:`);

        if (nombreOriginal !== nombreNormalizado) {
          console.log(`   Nombre:`);
          console.log(`   ANTES: "${nombreOriginal}"`);
          console.log(`   AHORA: "${nombreNormalizado}"`);
        }

        if (descripcionOriginal !== descripcionNormalizada) {
          console.log(`   Descripción:`);
          console.log(`   ANTES: "${descripcionOriginal.substring(0, 50)}${descripcionOriginal.length > 50 ? '...' : ''}"`);
          console.log(`   AHORA: "${descripcionNormalizada.substring(0, 50)}${descripcionNormalizada.length > 50 ? '...' : ''}"`);
        }

        // Actualizar en la base de datos
        const { error: updateError } = await supabase
          .from('tareas')
          .update({
            nombre_tarea: nombreNormalizado,
            descripcion_tarea: descripcionNormalizada
          })
          .eq('id', tarea.id);

        if (updateError) {
          console.error(`   ❌ Error al actualizar tarea ${tarea.id}:`, updateError);
        } else {
          console.log(`   ✅ Tarea actualizada correctamente\n`);
          tareasModificadas++;
        }
      } else {
        tareasSinCambios++;
        console.log(`✓ Tarea ID ${tarea.id}: Sin cambios necesarios`);
      }
    }

    // 3. Resumen
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE NORMALIZACIÓN');
    console.log('='.repeat(60));
    console.log(`Total de tareas: ${tareas.length}`);
    console.log(`Tareas modificadas: ${tareasModificadas}`);
    console.log(`Tareas sin cambios: ${tareasSinCambios}`);
    console.log('='.repeat(60));
    console.log('\n✅ Normalización completada exitosamente!\n');

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar el script
normalizarTodasLasTareas();
