import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PatientMapping {
  patientId: string | null;
  patientName: string | null;
  loading: boolean;
}

// Static mapping for known patients (optimization to avoid extra queries)
const KNOWN_PATIENTS: Record<string, string> = {
  reneer: "8dcf696b-8f4f-4a58-a1f5-cd55ff1999bd",
  ana_paula: "5a6ab9fe-101f-4258-a7f8-7e70590d5054",
};

export const getPatientIdFromUserPerson = (userPerson: string): string | null => {
  return KNOWN_PATIENTS[userPerson.toLowerCase()] || null;
};

export const getUserPersonFromPatientId = (patientId: string): string | null => {
  const entry = Object.entries(KNOWN_PATIENTS).find(([_, id]) => id === patientId);
  return entry ? entry[0] : null;
};

export const usePatientId = (userPerson: string | undefined): PatientMapping => {
  const [patientId, setPatientId] = useState<string | null>(null);
  const [patientName, setPatientName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPatientId = async () => {
      if (!userPerson) {
        setLoading(false);
        return;
      }

      // Try static mapping first
      const staticId = getPatientIdFromUserPerson(userPerson);
      if (staticId) {
        setPatientId(staticId);
        setPatientName(userPerson === "reneer" ? "Reneer" : "Ana Paula");
        setLoading(false);
        return;
      }

      // Fallback to database lookup
      try {
        const { data, error } = await supabase
          .from("patients")
          .select("id, name")
          .or(`name.eq.${userPerson},name.ilike.${userPerson.replace("_", " ")}`)
          .maybeSingle();

        if (error) throw error;
        
        if (data) {
          setPatientId(data.id);
          setPatientName(data.name);
        }
      } catch (error) {
        console.error("Error fetching patient ID:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPatientId();
  }, [userPerson]);

  return { patientId, patientName, loading };
};

export default usePatientId;
