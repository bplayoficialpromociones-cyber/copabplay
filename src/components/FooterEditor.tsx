import { useState, useEffect, useRef } from 'react';
import { Save, Eye, Code, Bold, Italic, Link as LinkIcon, Globe } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Language } from '../hooks/useLanguage';

interface FooterContent {
  id: string;
  content: string;
  language: string;
}

export default function FooterEditor() {
  const [content, setContent] = useState('');
  const [footerId, setFooterId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showHtml, setShowHtml] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('es');
  const [syncToAllLanguages, setSyncToAllLanguages] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const isUserEditingRef = useRef(false);

  const languages: { code: Language; name: string; flag: string }[] = [
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'pt', name: 'Português', flag: '🇧🇷' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'zh', name: '中文', flag: '🇨🇳' }
  ];

  const fetchFooterContent = async (lang: Language) => {
    setLoading(true);
    isUserEditingRef.current = false;
    try {
      const { data, error } = await supabase
        .from('footer_content')
        .select('*')
        .eq('language', lang)
        .maybeSingle();

      if (error) throw error;

      const newContent = data ? data.content : '';
      setContent(newContent);
      setFooterId(data ? data.id : null);
    } catch (error) {
      console.error('Error al obtener contenido del footer:', error);
      alert('Error al cargar contenido del footer');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFooterContent(selectedLanguage);
  }, [selectedLanguage]);

  useEffect(() => {
    if (editorRef.current && !loading && !isUserEditingRef.current) {
      editorRef.current.innerHTML = content;
    }
  }, [content, loading]);

  useEffect(() => {
    if (!showHtml && editorRef.current) {
      editorRef.current.innerHTML = content;
    }
  }, [showHtml]);

  const saveContent = async () => {
    setSaving(true);
    try {
      if (syncToAllLanguages) {
        const targetLangs = languages.map(l => l.code).filter(l => l !== selectedLanguage);

        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/translate-content`;
        const headers = {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        };

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            text: content,
            sourceLang: selectedLanguage,
            targetLangs: targetLangs
          })
        });

        if (!response.ok) {
          throw new Error('Error al traducir contenido');
        }

        const { translations } = await response.json();

        for (const lang of languages) {
          const translatedContent = translations[lang.code] || content;

          const { data: existingData } = await supabase
            .from('footer_content')
            .select('id')
            .eq('language', lang.code)
            .maybeSingle();

          if (existingData) {
            await supabase
              .from('footer_content')
              .update({
                content: translatedContent,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingData.id);
          } else {
            await supabase
              .from('footer_content')
              .insert({
                language: lang.code,
                content: translatedContent
              });
          }
        }
        alert('Contenido traducido y guardado en todos los idiomas exitosamente');
        isUserEditingRef.current = false;
      } else {
        if (footerId) {
          const { error } = await supabase
            .from('footer_content')
            .update({
              content: content,
              updated_at: new Date().toISOString()
            })
            .eq('id', footerId);

          if (error) throw error;
        } else {
          const { data, error } = await supabase
            .from('footer_content')
            .insert({
              language: selectedLanguage,
              content: content
            })
            .select()
            .single();

          if (error) throw error;
          if (data) {
            setFooterId(data.id);
          }
        }
        alert('Contenido del footer guardado exitosamente');
        isUserEditingRef.current = false;
      }
    } catch (error) {
      console.error('Error al guardar footer:', error);
      alert('Error al guardar contenido del footer');
    } finally {
      setSaving(false);
    }
  };

  const applyFormat = (command: string, value?: string) => {
    const selection = window.getSelection();
    const savedRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

    document.execCommand(command, false, value);

    if (editorRef.current) {
      setContent(editorRef.current.innerHTML);
    }

    if (savedRange && selection) {
      try {
        selection.removeAllRanges();
        selection.addRange(savedRange);
      } catch (e) {
        console.log('Could not restore selection');
      }
    }

    editorRef.current?.focus();
  };

  const insertColoredText = (color: string) => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      applyFormat('foreColor', color);
    }
  };

  const handleEditorInput = () => {
    isUserEditingRef.current = true;
    if (editorRef.current) {
      const currentContent = editorRef.current.innerHTML;
      if (currentContent !== content) {
        setContent(currentContent);
      }
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Cargando editor...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Editor de Footer</h2>
          <p className="text-gray-600">Edita el contenido de información importante que aparece en el ranking</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-4 border border-gray-200">
        <div className="flex items-center gap-3">
          <Globe className="w-5 h-5 text-gray-600" />
          <span className="font-semibold text-gray-700">Idioma:</span>
          <div className="flex gap-2 flex-wrap">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setSelectedLanguage(lang.code)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                  selectedLanguage === lang.code
                    ? 'bg-green-600 text-white shadow-lg scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="text-xl">{lang.flag}</span>
                <span>{lang.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={syncToAllLanguages}
            onChange={(e) => setSyncToAllLanguages(e.target.checked)}
            className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
          />
          <div>
            <span className="font-semibold text-amber-900">Traducir y aplicar este contenido a TODOS los idiomas</span>
            <p className="text-sm text-amber-700 mt-1">
              Al activar esta opción y guardar, el contenido actual se traducirá automáticamente y se aplicará a todos los idiomas (Español, English, Português, Français, Deutsch, 中文). Si la traducción automática no está disponible, se aplicará el mismo contenido a todos los idiomas.
            </p>
          </div>
        </label>
      </div>

      <div className="flex items-center justify-between">
        <div></div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Eye className="w-5 h-5" />
            {showPreview ? 'Ocultar Vista Previa' : 'Vista Previa'}
          </button>
          <button
            onClick={() => setShowHtml(!showHtml)}
            className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Code className="w-5 h-5" />
            {showHtml ? 'Editor Visual' : 'Ver HTML'}
          </button>
          <button
            onClick={saveContent}
            disabled={saving}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>

      {!showHtml && (
        <div className="bg-white rounded-lg shadow-lg border border-gray-200">
          <div className="border-b border-gray-200 p-3 flex flex-wrap gap-2">
            <button
              onClick={() => applyFormat('bold')}
              className="p-2 hover:bg-gray-100 rounded border border-gray-300"
              title="Negrita"
            >
              <Bold className="w-5 h-5" />
            </button>
            <button
              onClick={() => applyFormat('italic')}
              className="p-2 hover:bg-gray-100 rounded border border-gray-300"
              title="Cursiva"
            >
              <Italic className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                const url = prompt('Ingrese la URL:');
                if (url) applyFormat('createLink', url);
              }}
              className="p-2 hover:bg-gray-100 rounded border border-gray-300"
              title="Insertar enlace"
            >
              <LinkIcon className="w-5 h-5" />
            </button>

            <div className="h-8 w-px bg-gray-300 mx-2"></div>

            <button
              onClick={() => insertColoredText('#FFD700')}
              className="w-8 h-8 rounded border-2 border-gray-300 hover:scale-110 transition-transform"
              style={{ backgroundColor: '#FFD700' }}
              title="Dorado"
            />
            <button
              onClick={() => insertColoredText('#00FF87')}
              className="w-8 h-8 rounded border-2 border-gray-300 hover:scale-110 transition-transform"
              style={{ backgroundColor: '#00FF87' }}
              title="Verde bplay"
            />
            <button
              onClick={() => insertColoredText('#FF4444')}
              className="w-8 h-8 rounded border-2 border-gray-300 hover:scale-110 transition-transform"
              style={{ backgroundColor: '#FF4444' }}
              title="Rojo"
            />
            <button
              onClick={() => insertColoredText('#FFFFFF')}
              className="w-8 h-8 rounded border-2 border-gray-300 hover:scale-110 transition-transform bg-white"
              title="Blanco"
            />
            <button
              onClick={() => insertColoredText('#000000')}
              className="w-8 h-8 rounded border-2 border-gray-300 hover:scale-110 transition-transform bg-black"
              title="Negro"
            />

            <div className="h-8 w-px bg-gray-300 mx-2"></div>

            <select
              onChange={(e) => {
                if (e.target.value) {
                  applyFormat('fontSize', e.target.value);
                  e.target.value = '';
                }
              }}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50"
            >
              <option value="">Tamaño</option>
              <option value="1">Pequeño</option>
              <option value="3">Normal</option>
              <option value="5">Grande</option>
              <option value="7">Muy Grande</option>
            </select>
          </div>

          <div
            ref={editorRef}
            contentEditable
            onInput={handleEditorInput}
            className="p-6 min-h-[300px] focus:outline-none prose prose-lg max-w-none"
            style={{ color: '#000' }}
            suppressContentEditableWarning={true}
          />
        </div>
      )}

      {showHtml && (
        <div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-96 p-4 font-mono text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="Código HTML..."
          />
        </div>
      )}

      {showPreview && (
        <div className="bg-gradient-to-r from-[#00FF87]/20 to-[#00CC6A]/20 backdrop-blur-sm rounded-2xl p-6 border-2 border-[#00FF87]">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Vista Previa:</h3>
          <div className="flex items-start justify-center md:justify-start gap-4">
            <span className="text-4xl mt-1 flex-shrink-0">⚠️</span>
            <div
              dangerouslySetInnerHTML={{ __html: content }}
              className="text-white text-sm md:text-base font-semibold leading-relaxed"
            />
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Consejos de edición:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Usa los botones de color para resaltar información importante</li>
          <li>• El contenido se mostrará en el footer del ranking público</li>
          <li>• Puedes usar emojis directamente en el texto: ⚠️ 💰 🎁 ⭐</li>
          <li>• Cambia al modo HTML si necesitas control avanzado del formato</li>
          <li>• Los cambios se reflejan inmediatamente al guardar</li>
        </ul>
      </div>
    </div>
  );
}
