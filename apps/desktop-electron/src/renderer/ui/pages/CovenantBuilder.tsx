import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Input from "../components/Input";
import Select from "../components/Select";
import Button from "../components/Button";
import { ipcInvoke, unwrapResult } from "../api/client";
import { useAuth } from "../contexts/AuthContext";

export default function CovenantBuilder() {
  const { loanId } = useParams();
  const { sessionId } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    covenantType: "Ratio",
    formulaId: "",
    thresholdOp: "<=",
    thresholdValue: 3.5,
    frequency: "Quarterly",
    status: "Active"
  });

  const formulasQuery = useQuery({
    queryKey: ["formulas"],
    queryFn: async () => {
      const result = await ipcInvoke("formulas:list", { sessionId: sessionId ?? "" });
      return unwrapResult(result);
    },
    enabled: Boolean(sessionId)
  });

  useEffect(() => {
    if (!form.formulaId && formulasQuery.data && formulasQuery.data.length > 0) {
      setForm((prev) => ({ ...prev, formulaId: formulasQuery.data[0].id }));
    }
  }, [form.formulaId, formulasQuery.data]);

  const handleSubmit = async () => {
    if (!loanId || !sessionId) {
      return;
    }
    const result = await ipcInvoke("covenants:create", {
      sessionId,
      input: {
        loanId,
        name: form.name,
        covenantType: form.covenantType as "Ratio" | "Threshold" | "Info",
        formulaId: form.formulaId || (formulasQuery.data?.[0]?.id ?? ""),
        thresholdOp: form.thresholdOp as "<=" | ">=" | "<" | ">" | "=",
        thresholdValue: Number(form.thresholdValue),
        frequency: form.frequency as "Once" | "Monthly" | "Quarterly" | "Annually" | "Adhoc",
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
        title="Covenant Builder"
        subtitle="Configure ratio logic, thresholds, and monitoring cadence."
      />
      <Card className="p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Select
            label="Formula template"
            value={form.formulaId}
            onChange={(e) => setForm({ ...form, formulaId: e.target.value })}
          >
            {formulasQuery.data?.map((formula) => (
              <option key={formula.id} value={formula.id}>
                {formula.name}
              </option>
            ))}
          </Select>
          <Select
            label="Threshold operator"
            value={form.thresholdOp}
            onChange={(e) => setForm({ ...form, thresholdOp: e.target.value })}
          >
            <option value="<=">&lt;=</option>
            <option value=">=">&gt;=</option>
            <option value="<">&lt;</option>
            <option value=">">&gt;</option>
            <option value="=">=</option>
          </Select>
          <Input
            label="Threshold value"
            type="number"
            value={form.thresholdValue}
            onChange={(e) => setForm({ ...form, thresholdValue: Number(e.target.value) })}
          />
          <Select
            label="Frequency"
            value={form.frequency}
            onChange={(e) => setForm({ ...form, frequency: e.target.value })}
          >
            <option value="Monthly">Monthly</option>
            <option value="Quarterly">Quarterly</option>
            <option value="Annually">Annually</option>
          </Select>
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            <option value="Active">Active</option>
            <option value="Paused">Paused</option>
            <option value="Closed">Closed</option>
          </Select>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={handleSubmit}>
            Save Covenant
          </Button>
        </div>
      </Card>
    </div>
  );
}
