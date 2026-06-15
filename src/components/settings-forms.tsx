"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  updateBusinessProfile,
  changePassword,
} from "@/lib/settings-actions";

type Profile = {
  companyName: string;
  addressLine1: string | null;
  addressLine2: string | null;
  email: string | null;
  phone: string | null;
  taxId: string | null;
  taxRate: number;
  defaultHourlyRate: number;
  currency: string;
  invoiceNotes: string | null;
};

export function BusinessProfileForm({ profile }: { profile: Profile }) {
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const res = await updateBusinessProfile(new FormData(e.currentTarget));
    setSaving(false);
    if (res.error) toast.error(res.error);
    else toast.success("Business profile saved");
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label htmlFor="companyName" className="mb-1.5">
          Company name
        </Label>
        <Input id="companyName" name="companyName" defaultValue={profile.companyName} />
      </div>
      <div>
        <Label htmlFor="addressLine1" className="mb-1.5">
          Address line 1
        </Label>
        <Input id="addressLine1" name="addressLine1" defaultValue={profile.addressLine1 ?? ""} />
      </div>
      <div>
        <Label htmlFor="addressLine2" className="mb-1.5">
          Address line 2
        </Label>
        <Input id="addressLine2" name="addressLine2" defaultValue={profile.addressLine2 ?? ""} />
      </div>
      <div>
        <Label htmlFor="email" className="mb-1.5">
          Email
        </Label>
        <Input id="email" name="email" type="email" defaultValue={profile.email ?? ""} />
      </div>
      <div>
        <Label htmlFor="phone" className="mb-1.5">
          Phone
        </Label>
        <Input id="phone" name="phone" defaultValue={profile.phone ?? ""} />
      </div>
      <div>
        <Label htmlFor="taxId" className="mb-1.5">
          Tax / VAT ID
        </Label>
        <Input id="taxId" name="taxId" defaultValue={profile.taxId ?? ""} />
      </div>
      <div>
        <Label htmlFor="currency" className="mb-1.5">
          Currency (ISO code)
        </Label>
        <Input id="currency" name="currency" defaultValue={profile.currency} maxLength={3} />
      </div>
      <div>
        <Label htmlFor="taxRate" className="mb-1.5">
          Default tax rate (%)
        </Label>
        <Input
          id="taxRate"
          name="taxRate"
          type="number"
          step="0.01"
          defaultValue={profile.taxRate}
        />
      </div>
      <div>
        <Label htmlFor="defaultHourlyRate" className="mb-1.5">
          Default hourly rate
        </Label>
        <Input
          id="defaultHourlyRate"
          name="defaultHourlyRate"
          type="number"
          step="0.01"
          defaultValue={profile.defaultHourlyRate}
        />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="invoiceNotes" className="mb-1.5">
          Default invoice footer note
        </Label>
        <Input
          id="invoiceNotes"
          name="invoiceNotes"
          defaultValue={profile.invoiceNotes ?? ""}
          placeholder="e.g. Payment due within 14 days. Thank you!"
        />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save profile"}
        </Button>
      </div>
    </form>
  );
}

export function ChangePasswordForm() {
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setSaving(true);
    const res = await changePassword(new FormData(form));
    setSaving(false);
    if (res.error) toast.error(res.error);
    else {
      toast.success("Password updated");
      form.reset();
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-md gap-4">
      <div>
        <Label htmlFor="currentPassword" className="mb-1.5">
          Current password
        </Label>
        <Input id="currentPassword" name="currentPassword" type="password" required />
      </div>
      <div>
        <Label htmlFor="newPassword" className="mb-1.5">
          New password
        </Label>
        <Input id="newPassword" name="newPassword" type="password" required />
      </div>
      <div>
        <Label htmlFor="confirmPassword" className="mb-1.5">
          Confirm new password
        </Label>
        <Input id="confirmPassword" name="confirmPassword" type="password" required />
      </div>
      <div>
        <Button type="submit" variant="outline" disabled={saving}>
          {saving ? "Updating…" : "Change password"}
        </Button>
      </div>
    </form>
  );
}
