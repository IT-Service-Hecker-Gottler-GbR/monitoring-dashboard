import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { BusinessProfileForm, ChangePasswordForm } from "@/components/settings-forms";
import { getBusinessProfile } from "@/lib/business";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const profile = await getBusinessProfile();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Business details used on invoices, and your account"
      />

      <Card>
        <CardHeader>
          <CardTitle>Business profile</CardTitle>
          <CardDescription>
            These details appear on the header and footer of your invoices.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BusinessProfileForm profile={profile} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>
            Update the password used to sign in to the suite.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
