'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { Mail, Send, Clock, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { breadcrumbSchema } from '@/lib/schemas'

const CONTACT_METHODS = [
  {
    icon: Mail,
    label: 'Email',
    value: 'hello@raisegg.com',
    href: 'mailto:hello@raisegg.com',
    response: 'Within 24 hours',
  },
  {
    icon: MessageCircle,
    label: 'Telegram',
    value: '@raisegg',
    href: 'https://t.me/raisegg',
    response: 'Within 1 hour during business hours',
  },
]

export default function SupportPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const crumbs = breadcrumbSchema([
    { name: 'Home', url: 'https://raisegg.com' },
    { name: 'Support', url: 'https://raisegg.com/support' },
  ])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to send message')
      }
      setStatus('sent')
      setForm({ name: '', email: '', subject: '', message: '' })
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="font-orbitron text-4xl sm:text-5xl font-black mb-4 text-gradient leading-tight">
          Support
        </h1>
        <p className="text-muted text-lg mb-12 max-w-2xl">
          Need help? Reach out through any of the methods below or send us a message directly.
        </p>

        {/* FAQ Link */}
        <div className="card mb-10 flex items-center gap-4">
          <Clock className="w-6 h-6 text-accent-cyan flex-shrink-0" />
          <div>
            <p className="text-white font-semibold text-sm">Check our FAQ first</p>
            <p className="text-muted text-xs">
              Most questions are answered in our{' '}
              <Link href="/faq" className="text-accent-cyan hover:text-accent-cyan-glow transition-colors">
                Frequently Asked Questions
              </Link>{' '}
              page.
            </p>
          </div>
        </div>

        {/* Contact Methods */}
        <div className="grid sm:grid-cols-2 gap-4 mb-12">
          {CONTACT_METHODS.map((m) => (
            <a
              key={m.label}
              href={m.href}
              target={m.href.startsWith('http') ? '_blank' : undefined}
              rel={m.href.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="card hover:border-accent-cyan/40 transition-colors group"
            >
              <m.icon className="w-6 h-6 text-accent-cyan mb-3 group-hover:text-accent-cyan-glow transition-colors" />
              <div className="font-orbitron font-bold text-white text-sm mb-1">{m.label}</div>
              <div className="text-accent-cyan text-sm mb-2">{m.value}</div>
              <div className="text-muted text-xs flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {m.response}
              </div>
            </a>
          ))}
        </div>

        {/* Contact Form */}
        <div className="card">
          <h2 className="font-orbitron text-xl font-bold text-white mb-6">Send a Message</h2>

          {status === 'sent' ? (
            <div className="text-center py-8">
              <div className="text-green-400 font-orbitron font-bold text-lg mb-2">Message Sent</div>
              <p className="text-muted text-sm">We will get back to you within 24 hours.</p>
              <Button variant="secondary" className="mt-6" onClick={() => setStatus('idle')}>
                Send Another
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-muted uppercase tracking-wider mb-1.5">Name</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-space-800 border border-space-700 rounded px-3 py-2.5 text-white text-sm placeholder:text-muted focus:border-accent-cyan focus:outline-none transition-colors"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted uppercase tracking-wider mb-1.5">Email</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-space-800 border border-space-700 rounded px-3 py-2.5 text-white text-sm placeholder:text-muted focus:border-accent-cyan focus:outline-none transition-colors"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-muted uppercase tracking-wider mb-1.5">Subject</label>
                <input
                  type="text"
                  required
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="w-full bg-space-800 border border-space-700 rounded px-3 py-2.5 text-white text-sm placeholder:text-muted focus:border-accent-cyan focus:outline-none transition-colors"
                  placeholder="What do you need help with?"
                />
              </div>

              <div>
                <label className="block text-xs text-muted uppercase tracking-wider mb-1.5">Message</label>
                <textarea
                  required
                  rows={5}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="w-full bg-space-800 border border-space-700 rounded px-3 py-2.5 text-white text-sm placeholder:text-muted focus:border-accent-cyan focus:outline-none transition-colors resize-y"
                  placeholder="Describe your issue or question..."
                />
              </div>

              {status === 'error' && (
                <div className="text-red-400 text-sm">{errorMsg}</div>
              )}

              <Button type="submit" loading={status === 'loading'}>
                <Send className="w-4 h-4" />
                Send Message
              </Button>
            </form>
          )}
        </div>
      </div>
    </>
  )
}
