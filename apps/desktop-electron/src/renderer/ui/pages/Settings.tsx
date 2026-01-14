import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Input from "../components/Input";
import Select from "../components/Select";
import Button from "../components/Button";
import Table from "../components/Table";
import TextArea from "../components/TextArea";
import { ipcInvoke, unwrapResult } from "../api/client";
import { useAuth } from "../contexts/AuthContext";

export default function Settings() {
  const { sessionId, user } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "BorrowerReporter",
    password: ""
  });
  const [templateForm, setTemplateForm] = useState({
    key: "",
    category: "Definitions",
    title: "",
    bodyText: "",
    placeholders: ""
  });
  const canEditTemplates = user?.role === "Admin" || user?.role === "LenderOps";

  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const result = await ipcInvoke("users:list", { sessionId: sessionId ?? "" });
      return unwrapResult(result);
    },
    enabled: Boolean(sessionId)
  });

  const integrationsQuery = useQuery({
    queryKey: ["integrations"],
    queryFn: async () => {
      const result = await ipcInvoke("integrations:status", { sessionId: sessionId ?? "" });
      return unwrapResult(result);
    },
    enabled: Boolean(sessionId)
  });

  const templatesQuery = useQuery({
    queryKey: ["templates"],
    queryFn: async () => {
      const result = await ipcInvoke("templates:list", { sessionId: sessionId ?? "" });
      return unwrapResult(result);
    },
    enabled: Boolean(sessionId && canEditTemplates)
  });

  const createUser = async () => {
    if (!sessionId) {
      return;
    }
    const result = await ipcInvoke("users:create", {
      sessionId,
      input: {
        name: form.name,
        email: form.email,
        role: form.role as "Admin" | "LenderOps" | "BorrowerReporter" | "Auditor",
        password: form.password
      }
    });
    unwrapResult(result);
    setForm({ name: "", email: "", role: "BorrowerReporter", password: "" });
    queryClient.invalidateQueries({ queryKey: ["users"] });
  };

  const updateRole = async (userId: string, role: string) => {
    if (!sessionId) {
      return;
    }
    await ipcInvoke("users:updateRole", { sessionId, userId, role: role as "Admin" | "LenderOps" | "BorrowerReporter" | "Auditor" });
    queryClient.invalidateQueries({ queryKey: ["users"] });
  };

  const resetPassword = async (userId: string) => {
    if (!sessionId) {
      return;
    }
    await ipcInvoke("users:resetPassword", { sessionId, userId, newPassword: "Reset123!" });
    queryClient.invalidateQueries({ queryKey: ["users"] });
  };

  const createTemplate = async () => {
    if (!sessionId || !canEditTemplates) {
      return;
    }
    const result = await ipcInvoke("templates:create", {
      sessionId,
      input: {
        key: templateForm.key,
        category: templateForm.category,
        title: templateForm.title,
        bodyText: templateForm.bodyText,
        placeholders: templateForm.placeholders
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      }
    });
    unwrapResult(result);
    setTemplateForm({ key: "", category: "Definitions", title: "", bodyText: "", placeholders: "" });
    queryClient.invalidateQueries({ queryKey: ["templates"] });
  };

  const updateTemplate = async (templateId: string, currentTitle: string, currentBody: string) => {
    if (!sessionId || !canEditTemplates) {
      return;
    }
    const nextTitle = window.prompt("Update template title:", currentTitle);
    if (!nextTitle) {
      return;
    }
    const nextBody = window.prompt("Update template body:", currentBody);
    if (!nextBody) {
      return;
    }
    await ipcInvoke("templates:update", {
      sessionId,
      input: { id: templateId, title: nextTitle, bodyText: nextBody }
    });
    queryClient.invalidateQueries({ queryKey: ["templates"] });
  };

  const deleteTemplate = async (templateId: string) => {
    if (!sessionId || !canEditTemplates) {
      return;
    }
    await ipcInvoke("templates:delete", { sessionId, templateId });
    queryClient.invalidateQueries({ queryKey: ["templates"] });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Settings"
        subtitle="Manage users, roles, and access across the desktop workspace."
      />

      <Card className="p-6">
        <h3 className="text-lg font-semibold">Create User</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Select
            label="Role"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            <option value="Admin">Admin</option>
            <option value="LenderOps">Lender Ops</option>
            <option value="BorrowerReporter">Borrower Reporter</option>
            <option value="Auditor">Auditor</option>
          </Select>
          <Input
            label="Temporary password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="secondary" onClick={createUser}>
            Create User
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold">User Directory</h3>
        <div className="mt-4">
          <Table>
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {usersQuery.data?.map((user) => (
                <tr key={user.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-semibold text-ink">{user.name}</td>
                  <td className="px-4 py-3 text-slate-500">{user.email}</td>
                  <td className="px-4 py-3">
                    <Select
                      value={user.role}
                      onChange={(e) => updateRole(user.id, e.target.value)}
                    >
                      <option value="Admin">Admin</option>
                      <option value="LenderOps">Lender Ops</option>
                      <option value="BorrowerReporter">Borrower Reporter</option>
                      <option value="Auditor">Auditor</option>
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    <Button variant="outline" onClick={() => resetPassword(user.id)}>
                      Reset Password
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Card>

      {canEditTemplates && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold">Clause Template Library</h3>
          <p className="text-sm text-slate-500">Create reusable drafting snippets and placeholders.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Input
              label="Key"
              value={templateForm.key}
              onChange={(e) => setTemplateForm({ ...templateForm, key: e.target.value })}
            />
            <Select
              label="Category"
              value={templateForm.category}
              onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}
            >
              <option value="Definitions">Definitions</option>
              <option value="Covenants">Covenants</option>
              <option value="Reporting">Reporting</option>
              <option value="Events of Default">Events of Default</option>
              <option value="Misc">Misc</option>
            </Select>
            <Input
              label="Title"
              value={templateForm.title}
              onChange={(e) => setTemplateForm({ ...templateForm, title: e.target.value })}
            />
            <Input
              label="Placeholders (comma separated)"
              value={templateForm.placeholders}
              onChange={(e) => setTemplateForm({ ...templateForm, placeholders: e.target.value })}
            />
          </div>
          <div className="mt-4">
            <TextArea
              label="Template Body"
              value={templateForm.bodyText}
              onChange={(e) => setTemplateForm({ ...templateForm, bodyText: e.target.value })}
              rows={4}
            />
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="secondary" onClick={createTemplate}>
              Add Template
            </Button>
          </div>
          <div className="mt-6">
            <Table>
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Key</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {templatesQuery.data?.map((template) => (
                  <tr key={template.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-semibold text-ink">{template.key}</td>
                    <td className="px-4 py-3 text-slate-500">{template.category}</td>
                    <td className="px-4 py-3 text-slate-500">{template.title}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => updateTemplate(template.id, template.title, template.bodyText)}
                        >
                          Edit
                        </Button>
                        <Button variant="outline" onClick={() => deleteTemplate(template.id)}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {!templatesQuery.data?.length && (
              <p className="mt-3 text-xs text-slate-500">No templates created yet.</p>
            )}
          </div>
        </Card>
      )}

      <Card className="p-6">
        <h3 className="text-lg font-semibold">Integrations</h3>
        <p className="text-sm text-slate-500">Mock adapter ready for hackathon SDK wiring.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {integrationsQuery.data?.map((integration) => (
            <div key={integration.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-ink">{integration.name}</p>
              <p className="text-xs text-slate-500">Status: {integration.status}</p>
              <p className="text-xs text-slate-500">Last sync: {integration.lastSyncAt ?? "N/A"}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
