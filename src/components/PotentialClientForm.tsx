import React, { useState } from 'react';
import { Check, AlertCircle, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface FormData {
  nombre: string;
  apellido: string;
  numeroDocumento: string;
  fechaNacimiento: string;
  email: string;
  provincia: string;
  areaCode: string;
  phoneNumber: string;
  tieneCuentaBplay: string;
}

interface FormErrors {
  nombre?: string;
  apellido?: string;
  numeroDocumento?: string;
  fechaNacimiento?: string;
  email?: string;
  provincia?: string;
  areaCode?: string;
  phoneNumber?: string;
  tieneCuentaBplay?: string;
}

const provincias = [
  'Buenos Aires',
  'CABA',
  'Córdoba',
  'Mendoza',
  'Santa Fe'
].sort();

export function PotentialClientForm() {
  const [formData, setFormData] = useState<FormData>({
    nombre: '',
    apellido: '',
    numeroDocumento: '',
    fechaNacimiento: '',
    email: '',
    provincia: '',
    areaCode: '',
    phoneNumber: '',
    tieneCuentaBplay: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const validateEmail = (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validateDate = (date: string): boolean => {
    if (!date) return false;
    const selectedDate = new Date(date);
    const today = new Date();
    const minDate = new Date();
    minDate.setFullYear(today.getFullYear() - 100);
    return selectedDate < today && selectedDate > minDate;
  };

  const validateAreaCode = (code: string): boolean => {
    const cleanCode = code.replace(/\D/g, '');
    return cleanCode.length >= 2 && cleanCode.length <= 4;
  };

  const validatePhoneNumber = (phone: string): boolean => {
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length >= 6 && cleanPhone.length <= 8;
  };

  const validateDocumento = (documento: string): boolean => {
    const cleanDocumento = documento.replace(/\D/g, '');
    // DNI argentino: 7-8 dígitos (1.000.000 a 99.999.999)
    return cleanDocumento.length >= 7 && cleanDocumento.length <= 8;
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es obligatorio';
    }

    if (!formData.apellido.trim()) {
      newErrors.apellido = 'El apellido es obligatorio';
    }

    if (!formData.numeroDocumento.trim()) {
      newErrors.numeroDocumento = 'El número de documento es obligatorio';
    } else if (!validateDocumento(formData.numeroDocumento)) {
      newErrors.numeroDocumento = 'Ingrese un DNI válido (7-8 dígitos)';
    }

    if (!formData.fechaNacimiento) {
      newErrors.fechaNacimiento = 'La fecha de nacimiento es obligatoria';
    } else if (!validateDate(formData.fechaNacimiento)) {
      newErrors.fechaNacimiento = 'Ingrese una fecha válida';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'El email es obligatorio';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Ingrese un email válido';
    }

    if (!formData.provincia) {
      newErrors.provincia = 'La provincia es obligatoria';
    }

    if (!formData.areaCode.trim()) {
      newErrors.areaCode = 'El código de área es obligatorio';
    } else if (!validateAreaCode(formData.areaCode)) {
      newErrors.areaCode = 'Ingrese un código de área válido (2-4 dígitos)';
    }

    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'El número de celular es obligatorio';
    } else if (!validatePhoneNumber(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Ingrese un número válido (6-8 dígitos)';
    }

    if (!formData.tieneCuentaBplay) {
      newErrors.tieneCuentaBplay = 'Este campo es obligatorio';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const fullPhone = `+54${formData.areaCode}${formData.phoneNumber}`;
      const cleanDocumento = formData.numeroDocumento.replace(/\D/g, '');

      const { data: existingClient, error: checkError } = await supabase
        .from('potential_clients')
        .select('numero_documento')
        .eq('numero_documento', cleanDocumento)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking DNI:', checkError);
        throw new Error('Error al verificar el DNI');
      }

      if (existingClient) {
        setErrors({ numeroDocumento: 'Este DNI ya está registrado. No puede volver a completar el formulario.' });
        setIsSubmitting(false);
        return;
      }

      const clientData = {
        nombre: formData.nombre.trim(),
        apellido: formData.apellido.trim(),
        numero_documento: cleanDocumento,
        fecha_nacimiento: formData.fechaNacimiento,
        email: formData.email.trim().toLowerCase(),
        provincia: formData.provincia,
        celular: fullPhone,
        tiene_cuenta_bplay: formData.tieneCuentaBplay
      };

      const { data: insertedData, error: dbError } = await supabase
        .from('potential_clients')
        .insert(clientData)
        .select()
        .single();

      if (dbError) throw dbError;

      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        await fetch(`${supabaseUrl}/functions/v1/send-potential-client-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            ...clientData,
            fecha_nacimiento: new Date(formData.fechaNacimiento).toLocaleDateString('es-AR')
          })
        });
      } catch (emailError) {
        console.error('Email notification failed:', emailError);
      }

      setSubmitSuccess(true);
      setFormData({
        nombre: '',
        apellido: '',
        numeroDocumento: '',
        fechaNacimiento: '',
        email: '',
        provincia: '',
        areaCode: '',
        phoneNumber: '',
        tieneCuentaBplay: ''
      });
      setErrors({});

      setTimeout(() => setSubmitSuccess(false), 5000);
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Hubo un error al enviar el formulario. Por favor, intente nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const maxDate = new Date().toISOString().split('T')[0];
  const minDate = new Date();
  minDate.setFullYear(minDate.getFullYear() - 100);
  const minDateStr = minDate.toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-black py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="bg-gradient-to-br from-gray-900 to-black border-2 border-green-500 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-3xl font-black text-center text-green-500 mb-8" style={{ fontFamily: "'Impact', sans-serif", letterSpacing: '1px' }}>
            Completá el formulario con tus Datos
          </h2>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-bold mb-2 text-gray-300">
                Nombre *
              </label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                className={`w-full bg-black/50 border-2 ${
                  errors.nombre ? 'border-red-500' : 'border-green-500/30'
                } rounded-lg px-4 py-3 text-white focus:border-green-500 focus:outline-none transition-colors`}
                disabled={isSubmitting}
              />
              {errors.nombre && (
                <div className="flex items-center gap-2 mt-2 text-red-400 text-sm">
                  <AlertCircle size={16} />
                  <span>{errors.nombre}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold mb-2 text-gray-300">
                Apellido *
              </label>
              <input
                type="text"
                name="apellido"
                value={formData.apellido}
                onChange={handleChange}
                className={`w-full bg-black/50 border-2 ${
                  errors.apellido ? 'border-red-500' : 'border-green-500/30'
                } rounded-lg px-4 py-3 text-white focus:border-green-500 focus:outline-none transition-colors`}
                disabled={isSubmitting}
              />
              {errors.apellido && (
                <div className="flex items-center gap-2 mt-2 text-red-400 text-sm">
                  <AlertCircle size={16} />
                  <span>{errors.apellido}</span>
                </div>
              )}
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-bold mb-2 text-gray-300">
              Número de Documento (DNI) *
            </label>
            <input
              type="text"
              name="numeroDocumento"
              value={formData.numeroDocumento}
              onChange={handleChange}
              placeholder="12345678"
              maxLength={8}
              className={`w-full bg-black/50 border-2 ${
                errors.numeroDocumento ? 'border-red-500' : 'border-green-500/30'
              } rounded-lg px-4 py-3 text-white focus:border-green-500 focus:outline-none transition-colors font-mono`}
              disabled={isSubmitting}
            />
            {errors.numeroDocumento && (
              <div className="flex items-center gap-2 mt-2 text-red-400 text-sm">
                <AlertCircle size={16} />
                <span>{errors.numeroDocumento}</span>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">Ingrese su DNI sin puntos ni espacios</p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-bold mb-2 text-gray-300">
              Fecha de Nacimiento *
            </label>
            <div className="relative">
              <input
                type="date"
                name="fechaNacimiento"
                value={formData.fechaNacimiento}
                onChange={handleChange}
                max={maxDate}
                min={minDateStr}
                className={`w-full bg-black/50 border-2 ${
                  errors.fechaNacimiento ? 'border-red-500' : 'border-green-500/30'
                } rounded-lg px-4 py-3 text-white focus:border-green-500 focus:outline-none transition-colors [color-scheme:dark]`}
                disabled={isSubmitting}
              />
              <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={20} />
            </div>
            {errors.fechaNacimiento && (
              <div className="flex items-center gap-2 mt-2 text-red-400 text-sm">
                <AlertCircle size={16} />
                <span>{errors.fechaNacimiento}</span>
              </div>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-bold mb-2 text-gray-300">
              Email *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="ejemplo@email.com"
              className={`w-full bg-black/50 border-2 ${
                errors.email ? 'border-red-500' : 'border-green-500/30'
              } rounded-lg px-4 py-3 text-white focus:border-green-500 focus:outline-none transition-colors`}
              disabled={isSubmitting}
            />
            {errors.email && (
              <div className="flex items-center gap-2 mt-2 text-red-400 text-sm">
                <AlertCircle size={16} />
                <span>{errors.email}</span>
              </div>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-bold mb-2 text-gray-300">
              Provincia *
            </label>
            <select
              name="provincia"
              value={formData.provincia}
              onChange={handleChange}
              className={`w-full bg-black/50 border-2 ${
                errors.provincia ? 'border-red-500' : 'border-green-500/30'
              } rounded-lg px-4 py-3 text-white focus:border-green-500 focus:outline-none transition-colors`}
              disabled={isSubmitting}
            >
              <option value="">Seleccione una provincia</option>
              {provincias.map((prov) => (
                <option key={prov} value={prov}>{prov}</option>
              ))}
            </select>
            {errors.provincia && (
              <div className="flex items-center gap-2 mt-2 text-red-400 text-sm">
                <AlertCircle size={16} />
                <span>{errors.provincia}</span>
              </div>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-bold mb-2 text-gray-300">
              Celular *
            </label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="w-32">
                  <div className="bg-black/50 border-2 border-green-500/30 rounded-lg px-4 py-3 text-gray-400 text-center font-mono">
                    +54
                  </div>
                  <p className="text-xs text-gray-500 mt-1 text-center">Prefijo ARG</p>
                </div>
                <div className="flex-1">
                  <input
                    type="tel"
                    name="areaCode"
                    value={formData.areaCode}
                    onChange={handleChange}
                    placeholder="11"
                    maxLength={4}
                    className={`w-full bg-black/50 border-2 ${
                      errors.areaCode ? 'border-red-500' : 'border-green-500/30'
                    } rounded-lg px-4 py-3 text-white focus:border-green-500 focus:outline-none transition-colors font-mono`}
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-gray-500 mt-1">Código de área (sin 0 ni 15)</p>
                </div>
                <div className="flex-1">
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    placeholder="12345678"
                    maxLength={8}
                    className={`w-full bg-black/50 border-2 ${
                      errors.phoneNumber ? 'border-red-500' : 'border-green-500/30'
                    } rounded-lg px-4 py-3 text-white focus:border-green-500 focus:outline-none transition-colors font-mono`}
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-gray-500 mt-1">Número (sin 15)</p>
                </div>
              </div>
              {(errors.areaCode || errors.phoneNumber) && (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle size={16} />
                  <span>{errors.areaCode || errors.phoneNumber}</span>
                </div>
              )}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <p className="text-blue-300 text-sm">
                  <strong>Ejemplo:</strong> Para el celular (011) 15-1234-5678 ingresá:
                  <br />Código de área: <span className="font-mono">11</span> | Número: <span className="font-mono">12345678</span>
                </p>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <label className="block text-sm font-bold mb-2 text-gray-300">
              ¿Ya tenés cuenta en bplay? *
            </label>
            <select
              name="tieneCuentaBplay"
              value={formData.tieneCuentaBplay}
              onChange={handleChange}
              className={`w-full bg-black/50 border-2 ${
                errors.tieneCuentaBplay ? 'border-red-500' : 'border-green-500/30'
              } rounded-lg px-4 py-3 text-white focus:border-green-500 focus:outline-none transition-colors`}
              disabled={isSubmitting}
            >
              <option value="">Seleccione una opción</option>
              <option value="si">Sí</option>
              <option value="no">No</option>
              <option value="no_recuerdo">No recuerdo</option>
            </select>
            {errors.tieneCuentaBplay && (
              <div className="flex items-center gap-2 mt-2 text-red-400 text-sm">
                <AlertCircle size={16} />
                <span>{errors.tieneCuentaBplay}</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 rounded-lg text-xl font-black hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-green-500/50"
            style={{ fontFamily: "'Impact', sans-serif", letterSpacing: '1px' }}
          >
            {isSubmitting ? 'ENVIANDO...' : 'ENVIAR'}
          </button>

          {isSubmitting && (
            <div className="mt-4">
              <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 h-full rounded-full animate-pulse" style={{ width: '100%' }}></div>
              </div>
              <p className="text-center text-gray-400 text-sm mt-2">Enviando tus datos...</p>
            </div>
          )}

          {submitSuccess && (
            <div className="mt-4 bg-green-500/20 border-2 border-green-500 rounded-lg p-4 flex items-center gap-3 animate-fade-in">
              <Check size={24} className="text-green-500" />
              <div>
                <p className="text-green-400 font-semibold">Formulario enviado exitosamente</p>
                <p className="text-green-300 text-sm">Nos pondremos en contacto a la brevedad</p>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
