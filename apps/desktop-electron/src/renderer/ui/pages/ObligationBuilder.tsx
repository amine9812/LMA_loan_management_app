import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Input from "../components/Input";
import Select from "../components/Select";
import TextArea from "../components/TextArea";
import Button from "../components/Button";
import { ipcInvoke, unwrapResult } from "../api/client";
import { useAuth } from "../contexts/AuthContext";

export default function ObligationBuilder() {
  const { loanId } = useParams();
  const { sessionId } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    description: "",
    frequency: "Quarterly",
    ownerParty: "Borrower",
    severity: "Med",
    status: "Active",
    dueRuleType: "after_period_end",
    daysAfter: 45,
    period: "Quarter",
    month: 1,
    day: 31,
    customDescription: ""
  });

  const handleSubmit = async () => {
    if (!loanId || !sessionId) {
      return;
    }
    const dueRule =
      form.dueRuleType === "after_period_end"
        ? { type: "after_period_end", daysAfter: form.daysAfter, period: form.period }
        : form.dueRuleType === "fixed_date"
          ? { type: "fixed_date", month: form.month, day: form.day }
          : { type: "custom", description: form.customDescription };

    const result = await ipcInvoke("obligations:create", {
      sessionId,
      input: {
        loanId,
        title: form.title,
        description: form.description,
        frequency: form.frequency as "Once" | "Monthly" | "Quarterly" | "Annually" | "Adhoc",
        dueRule,
        ownerParty: form.ownerParty as "Borrower" | "Lender",
        severity: form.severity as "Low" | "Med" | "High",
        status: form.status as "Active" | "Paused" | "Closed",
        sourceClauseId: null
      }
    });
    unwrapResult(result);
    navigate(`/loans/${loanId}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Obligation Builder"
        subtitle="Define reporting deliverables and schedule rules."
      />
      <Card className="p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Select
            label="Frequency"
            value={form.frequency}
            onChange={(e) => setForm({ ...form, frequency: e.target.value })}
          >
            <option value="Once">Once</option>
            <option value="Monthly">Monthly</option>
            <option value="Quarterly">Quarterly</option>
            <option value="Annually">Annually</option>
            <option value="Adhoc">Adhoc</option>
          </Select>
          <Select
            label="Owner Party"
            value={form.ownerParty}
            onChange={(e) => setForm({ ...form, ownerParty: e.target.value })}
          >
            <option value="Borrower">Borrower</option>
            <option value="Lender">Lender</option>
          </Select>
          <Select
            label="Severity"
            value={form.severity}
            onChange={(e) => setForm({ ...form, severity: e.target.value })}
          >
            <option value="Low">Low</option>
            <option value="Med">Med</option>
            <option value="High">High</option>
          </Select>
        </div>
        <div className="mt-4">
          <TextArea
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={4}
          />
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Select
            label="Due rule template"
            value={form.dueRuleType}
            onChange={(e) => setForm({ ...form, dueRuleType: e.target.value })}
          >
            <option value="after_period_end">Due X days after period end</option>
            <option value="fixed_date">Fixed calendar date</option>
            <option value="custom">Custom / ad hoc</option>
          </Select>

          {form.dueRuleType === "after_period_end" && (
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Days after"
                type="number"
                value={form.daysAfter}
                onChange={(e) => setForm({ ...form, daysAfter: Number(e.target.value) })}
              />
              <Select
                label="Period"
                value={form.period}
                onChange={(e) => setForm({ ...form, period: e.target.value })}
              >
                <option value="Month">Month</option>
                <option value="Quarter">Quarter</option>
                <option value="Year">Year</option>
              </Select>
            </div>
          )}

          {form.dueRuleType === "fixed_date" && (
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Month (1-12)"
                type="number"
                value={form.month}
                onChange={(e) => setForm({ ...form, month: Number(e.target.value) })}
              />
              <Input
                label="Day"
                type="number"
                value={form.day}
                onChange={(e) => setForm({ ...form, day: Number(e.target.value) })}
              />
            </div>
          )}

          {form.dueRuleType === "custom" && (
            <TextArea
              label="Custom due rule"
              value={form.customDescription}
              onChange={(e) => setForm({ ...form, customDescription: e.target.value })}
              rows={3}
            />
          )}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={handleSubmit}>
            Save Obligation
          </Button>
        </div>
      </Card>
    </div>
  );
}
