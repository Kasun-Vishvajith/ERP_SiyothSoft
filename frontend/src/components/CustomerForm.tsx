import { useEffect, useState, type FormEvent } from "react";
import { request } from "../api";
import type { Customer } from "../types";

type CustomerFormProps = { customer?: Customer; onCancel: () => void; onSaved: () => void };

export function CustomerForm({ customer, onCancel, onSaved }: CustomerFormProps) {
  const [name, setName] = useState(customer?.name ?? "");
  const [email, setEmail] = useState(customer?.email ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setName(customer?.name ?? ""); setEmail(customer?.email ?? ""); setPhone(customer?.phone ?? ""); setError("");
  }, [customer]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (saving) return; setSaving(true); setError("");
    try {
      await request<Customer>(customer ? `/customers/${customer.id}` : "/customers", { method: customer ? "PUT" : "POST", body: JSON.stringify({ name: name.trim(), email: email.trim(), phone: phone.trim() }) });
      onSaved();
    } catch (caught: unknown) { setError(caught instanceof Error ? caught.message : "Could not save customer"); }
    finally { setSaving(false); }
  }

  return <section className="form-card directory-form" aria-labelledby="customer-form-title"><div className="section-heading"><div><span className="eyebrow">Customer record</span><h2 id="customer-form-title">{customer ? "Edit customer" : "New customer"}</h2></div><button className="button button--secondary" type="button" onClick={onCancel}>Cancel</button></div>{error && <div className="alert alert--error" role="alert">{error}</div>}<form className="field-grid" onSubmit={save}><label className="field"><span>Name</span><input value={name} maxLength={120} onChange={(event) => setName(event.target.value)} required /></label><label className="field"><span>Email <small>optional</small></span><input type="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} /></label><label className="field"><span>Phone <small>optional</small></span><input maxLength={30} value={phone} onChange={(event) => setPhone(event.target.value)} /></label><div className="form-actions"><button className="button button--primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save customer"}</button></div></form></section>;
}
