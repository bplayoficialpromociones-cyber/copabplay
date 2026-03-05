import React, { useState } from 'react';
import { Check, AlertCircle } from 'lucide-react';
import { Language } from '../hooks/useLanguage';
import { getTranslation } from '../data/translations';
import { supabase } from '../lib/supabase';

interface FormData {
  firstName: string;
  lastName: string;
  company: string;
  companyType: string;
  country: string;
  email: string;
  phone: string;
  comment: string;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  company?: string;
  companyType?: string;
  country?: string;
  email?: string;
  phone?: string;
}

interface Props {
  language: Language;
}

const countryCodes = [
  { code: '+54', country: 'Argentina', flag: '🇦🇷' },
  { code: '+55', country: 'Brazil', flag: '🇧🇷' },
  { code: '+56', country: 'Chile', flag: '🇨🇱' },
  { code: '+57', country: 'Colombia', flag: '🇨🇴' },
  { code: '+52', country: 'Mexico', flag: '🇲🇽' },
  { code: '+51', country: 'Peru', flag: '🇵🇪' },
  { code: '+34', country: 'Spain', flag: '🇪🇸' },
  { code: '+1', country: 'USA/Canada', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
];

export function ManufacturerContactForm({ language }: Props) {
  const t = getTranslation(language);
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    company: '',
    companyType: '',
    country: '',
    email: '',
    phone: '',
    comment: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [selectedCountryCode, setSelectedCountryCode] = useState('+54');

  const validateEmail = (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length >= 7 && cleanPhone.length <= 15;
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = t.contact.errors.required;
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = t.contact.errors.required;
    }

    if (!formData.company.trim()) {
      newErrors.company = t.contact.errors.required;
    }

    if (!formData.companyType) {
      newErrors.companyType = t.contact.errors.required;
    }

    if (!formData.country.trim()) {
      newErrors.country = t.contact.errors.required;
    }

    if (!formData.email.trim()) {
      newErrors.email = t.contact.errors.required;
    } else if (!validateEmail(formData.email)) {
      newErrors.email = t.contact.errors.invalidEmail;
    }

    if (!formData.phone.trim()) {
      newErrors.phone = t.contact.errors.required;
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = t.contact.errors.invalidPhone;
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
      const fullPhone = `${selectedCountryCode}${formData.phone}`;
      const fullName = `${formData.firstName.trim()} ${formData.lastName.trim()}`;

      const { error } = await supabase
        .from('manufacturer_contacts')
        .insert({
          first_name: formData.firstName.trim(),
          last_name: formData.lastName.trim(),
          company_name: formData.company.trim(),
          company_type: formData.companyType,
          country: formData.country.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: fullPhone,
          comment: formData.comment.trim() || null
        });

      if (error) throw error;

      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-manufacturer-contact`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: fullName,
            email: formData.email.trim().toLowerCase(),
            phone: fullPhone,
            company: formData.company.trim(),
            companyType: formData.companyType,
            message: formData.comment.trim() || 'Sin comentarios adicionales'
          })
        });

        if (!emailResponse.ok) {
          console.error('Error sending email notification');
        }
      } catch (emailError) {
        console.error('Email notification failed:', emailError);
      }

      setSubmitSuccess(true);
      setFormData({
        firstName: '',
        lastName: '',
        company: '',
        companyType: '',
        country: '',
        email: '',
        phone: '',
        comment: ''
      });
      setErrors({});

      setTimeout(() => setSubmitSuccess(false), 5000);
    } catch (error) {
      console.error('Error submitting form:', error);
      alert(t.contact.form.submitError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gradient-to-br from-gray-900 to-black border-2 border-green-500 rounded-2xl p-8 shadow-2xl">
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-sm font-bold mb-2 text-gray-300">
            {t.contact.form.firstName} *
          </label>
          <input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            className={`w-full bg-black/50 border-2 ${
              errors.firstName ? 'border-red-500' : 'border-green-500/30'
            } rounded-lg px-4 py-3 text-white focus:border-green-500 focus:outline-none transition-colors`}
            disabled={isSubmitting}
          />
          {errors.firstName && (
            <div className="flex items-center gap-2 mt-2 text-red-400 text-sm">
              <AlertCircle size={16} />
              <span>{errors.firstName}</span>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-bold mb-2 text-gray-300">
            {t.contact.form.lastName} *
          </label>
          <input
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            className={`w-full bg-black/50 border-2 ${
              errors.lastName ? 'border-red-500' : 'border-green-500/30'
            } rounded-lg px-4 py-3 text-white focus:border-green-500 focus:outline-none transition-colors`}
            disabled={isSubmitting}
          />
          {errors.lastName && (
            <div className="flex items-center gap-2 mt-2 text-red-400 text-sm">
              <AlertCircle size={16} />
              <span>{errors.lastName}</span>
            </div>
          )}
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-bold mb-2 text-gray-300">
          {t.contact.form.company} *
        </label>
        <input
          type="text"
          name="company"
          value={formData.company}
          onChange={handleChange}
          className={`w-full bg-black/50 border-2 ${
            errors.company ? 'border-red-500' : 'border-green-500/30'
          } rounded-lg px-4 py-3 text-white focus:border-green-500 focus:outline-none transition-colors`}
          disabled={isSubmitting}
        />
        {errors.company && (
          <div className="flex items-center gap-2 mt-2 text-red-400 text-sm">
            <AlertCircle size={16} />
            <span>{errors.company}</span>
          </div>
        )}
      </div>

      <div className="mb-6">
        <label className="block text-sm font-bold mb-2 text-gray-300">
          {t.contact.form.companyType} *
        </label>
        <select
          name="companyType"
          value={formData.companyType}
          onChange={handleChange}
          className={`w-full bg-black/50 border-2 ${
            errors.companyType ? 'border-red-500' : 'border-green-500/30'
          } rounded-lg px-4 py-3 text-white focus:border-green-500 focus:outline-none transition-colors`}
          disabled={isSubmitting}
        >
          <option value="">{t.contact.form.companyTypePlaceholder}</option>
          <option value="Operador">{t.contact.companyTypes.operator}</option>
          <option value="Fabricante">{t.contact.companyTypes.manufacturer}</option>
          <option value="Agregador">{t.contact.companyTypes.aggregator}</option>
          <option value="Otro Servicio">{t.contact.companyTypes.other}</option>
        </select>
        {errors.companyType && (
          <div className="flex items-center gap-2 mt-2 text-red-400 text-sm">
            <AlertCircle size={16} />
            <span>{errors.companyType}</span>
          </div>
        )}
      </div>

      <div className="mb-6">
        <label className="block text-sm font-bold mb-2 text-gray-300">
          {t.contact.form.country} *
        </label>
        <input
          type="text"
          name="country"
          value={formData.country}
          onChange={handleChange}
          className={`w-full bg-black/50 border-2 ${
            errors.country ? 'border-red-500' : 'border-green-500/30'
          } rounded-lg px-4 py-3 text-white focus:border-green-500 focus:outline-none transition-colors`}
          disabled={isSubmitting}
        />
        {errors.country && (
          <div className="flex items-center gap-2 mt-2 text-red-400 text-sm">
            <AlertCircle size={16} />
            <span>{errors.country}</span>
          </div>
        )}
      </div>

      <div className="mb-6">
        <label className="block text-sm font-bold mb-2 text-gray-300">
          {t.contact.form.email} *
        </label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
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
          {t.contact.form.phone} *
        </label>
        <div className="flex gap-2">
          <select
            value={selectedCountryCode}
            onChange={(e) => setSelectedCountryCode(e.target.value)}
            className="w-24 bg-black/50 border-2 border-green-500/30 rounded-lg px-2 py-3 text-white focus:border-green-500 focus:outline-none transition-colors text-sm"
            disabled={isSubmitting}
          >
            {countryCodes.map((country) => (
              <option key={country.code} value={country.code}>
                {country.flag} {country.code}
              </option>
            ))}
          </select>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="1234567890"
            className={`flex-1 min-w-0 bg-black/50 border-2 ${
              errors.phone ? 'border-red-500' : 'border-green-500/30'
            } rounded-lg px-4 py-3 text-white focus:border-green-500 focus:outline-none transition-colors`}
            disabled={isSubmitting}
          />
        </div>
        {errors.phone && (
          <div className="flex items-center gap-2 mt-2 text-red-400 text-sm">
            <AlertCircle size={16} />
            <span>{errors.phone}</span>
          </div>
        )}
      </div>

      <div className="mb-8">
        <label className="block text-sm font-bold mb-2 text-gray-300">
          {t.contact.form.comment}
        </label>
        <textarea
          name="comment"
          value={formData.comment}
          onChange={handleChange}
          rows={4}
          className="w-full bg-black/50 border-2 border-green-500/30 rounded-lg px-4 py-3 text-white focus:border-green-500 focus:outline-none transition-colors resize-none"
          disabled={isSubmitting}
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 rounded-lg text-xl font-black hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-green-500/50"
        style={{ fontFamily: "'Impact', sans-serif", letterSpacing: '1px' }}
      >
        {isSubmitting ? t.contact.form.sending : t.contact.form.submit}
      </button>

      {isSubmitting && (
        <div className="mt-4">
          <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 h-full rounded-full animate-pulse" style={{ width: '100%' }}></div>
          </div>
          <p className="text-center text-gray-400 text-sm mt-2">{t.contact.form.sending}...</p>
        </div>
      )}

      {submitSuccess && (
        <div className="mt-4 bg-green-500/20 border-2 border-green-500 rounded-lg p-4 flex items-center gap-3 animate-fade-in">
          <Check size={24} className="text-green-500" />
          <p className="text-green-400 font-semibold">{t.contact.form.success}</p>
        </div>
      )}
    </form>
  );
}
