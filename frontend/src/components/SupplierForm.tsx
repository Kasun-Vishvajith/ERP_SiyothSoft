import { useEffect, useState, type FormEvent } from "react";
import { request } from "../api";
import type { Supplier } from "../types";

type SupplierFormProps = { supplier?: Supplier; onCancel: () => void; onSaved: () => void };

export function SupplierForm({ supplier, onCancel, onSaved }: SupplierFormProps) {
  const [name, setName] = useState(supplier?.name ?? "");
  const [email, setEmail] = useState(supplier?.email ?? "");
  const [phone, setPhone] = useState(supplier?.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setName(supplier?.name ?? ""); setEmail(supplier?.email ?? ""); setPhone(supplier?.phone ?? ""); setError("");
  }, [supplier]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (saving) return; setSaving(true); setError("");
    try {
      await request<Supplier>(supplier ? `/suppliers/${supplier.id}` : "/suppliers", { method: supplier ? "PUT" : "POST", body: JSON.stringify({ name: name.trim(), email: email.trim(), phone: phone.trim() }) });
      onSaved();
    } catch (caught: unknown) { setError(caught instanceof Error ? caught.message : "Could not save supplier"); }
    finally { setSaving(false); }
  }

  return <section className="form-card directory-form" aria-labelledby="supplier-form-title"><div className="section-heading"><div><span className="eyebrow">Supplier record</span><h2 id="supplier-form-title">{supplier ? "Edit supplier" : "New supplier"}</h2></div><button className="button button--secondary" type="button" onClick={onCancel}>Cancel</button></div>{error && <div className="alert alert--error" role="alert">{error}</div>}<form className="field-grid" onSubmit={save}><label className="field"><span>Name</span><input value={name} maxLength={120} onChange={(event) => setName(event.target.value)} required /></label><label className="field"><span>Email <small>optional</small></span><input type="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} /></label><label className="field"><span>Phone <small>optional</small></span><input maxLength={30} value={phone} onChange={(event) => setPhone(event.target.value)} /></label><div className="form-actions"><button className="button button--primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save supplier"}</button></div></form></section>;
}
