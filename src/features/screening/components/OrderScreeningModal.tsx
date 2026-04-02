/**
 * Multi-step modal for ordering a background check.
 *
 * Steps:
 * 1. Select screening package
 * 2. FCRA certification (CertificationGate)
 * 3. Confirm and submit
 */

import { useState, useEffect } from "react";
import { fetchProducts, submitOrder } from "../api/screeningApi";
import { CertificationGate } from "./CertificationGate";
import type { ScreeningProduct } from "../types/screening";

interface Candidate {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

interface OrderScreeningModalProps {
  candidate: Candidate;
  onClose: () => void;
  onOrderSubmitted: (orderGuid: string) => void;
}

type Step = "select-package" | "certification" | "submitting" | "success";

export function OrderScreeningModal({
  candidate,
  onClose,
  onOrderSubmitted,
}: OrderScreeningModalProps) {
  const [step, setStep] = useState<Step>("select-package");
  const [products, setProducts] = useState<ScreeningProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [selectedProductName, setSelectedProductName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderResult, setOrderResult] = useState<{ order_guid: string; message: string } | null>(null);

  useEffect(() => {
    fetchProducts()
      .then((p) => {
        setProducts(p);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load screening packages.");
        setLoading(false);
      });
  }, []);

  const handleCertified = async () => {
    setStep("submitting");
    setError(null);

    try {
      const result = await submitOrder({
        candidate_id: candidate.id,
        first_name: candidate.firstName,
        last_name: candidate.lastName,
        email: candidate.email,
        product_guid: selectedProduct,
        product_name: selectedProductName,
        use_quick_app: true,
        certification_acknowledged: true,
      });

      setOrderResult(result);
      setStep("success");
      onOrderSubmitted(result.order_guid);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to submit screening order.";
      setError(message);
      setStep("select-package");
    }
  };

  // --- Step: Select Package ---
  if (step === "select-package") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full mx-4">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Order Background Check
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {candidate.firstName} {candidate.lastName}
            </p>
          </div>

          <div className="px-6 py-4 space-y-4">
            {error && (
              <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 p-3 rounded-lg">{error}</p>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Screening Package
              </label>
              {loading ? (
                <p className="text-gray-400 text-sm">Loading packages...</p>
              ) : (
                <select
                  value={selectedProduct}
                  onChange={(e) => {
                    setSelectedProduct(e.target.value);
                    const prod = products.find((p) => p.clientProductGuid === e.target.value);
                    setSelectedProductName(prod?.productName || "");
                  }}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                >
                  <option value="">Select a package...</option>
                  {products.map((p) => (
                    <option key={p.clientProductGuid} value={p.clientProductGuid}>
                      {p.productName}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-sm text-gray-600 dark:text-gray-300">
              <p className="font-medium text-gray-700 dark:text-gray-200 mb-1">QuickApp Enabled</p>
              <p>
                The applicant will receive an email to complete their personal
                information (SSN, addresses) through a secure TazWorks form.
                No sensitive PII will be entered in Bifrost.
              </p>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => setStep("certification")}
              disabled={!selectedProduct}
              className="px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Step: FCRA Certification ---
  if (step === "certification") {
    return (
      <CertificationGate
        onCertified={handleCertified}
        onCancel={() => setStep("select-package")}
      />
    );
  }

  // --- Step: Submitting ---
  if (step === "submitting") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-sm w-full mx-4 p-8 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Submitting background check...</p>
        </div>
      </div>
    );
  }

  // --- Step: Success ---
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full mx-4">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-emerald-700 dark:text-emerald-400">
            Background Check Submitted
          </h2>
        </div>
        <div className="px-6 py-4 space-y-3 text-sm text-gray-600 dark:text-gray-300">
          <p>{orderResult?.message}</p>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 space-y-1">
            <p><span className="font-medium text-gray-700 dark:text-gray-200">Order ID:</span> {orderResult?.order_guid}</p>
            <p><span className="font-medium text-gray-700 dark:text-gray-200">Status:</span> Awaiting Applicant</p>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
