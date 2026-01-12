import { X } from 'lucide-react';

export default function TermsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[85vh] overflow-hidden">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Terms and Conditions</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-6 overflow-y-auto max-h-[calc(85vh-120px)]">
            <div className="prose prose-sm max-w-none">

              <p className="mb-4">
                These Terms and Conditions ("Terms") govern access to and use of the FoodFlex platform, 
                including its mobile application and related services ("Platform"). By registering or using 
                FoodFlex, you agree to be bound by these Terms.
              </p>

              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">1. ABOUT FOODFLEX</h3>
              <p className="mb-4">
                FoodFlex is a Buy Now, Pay Later (BNPL) marketplace platform that enables eligible users 
                to purchase essential food and household items from independent local suppliers and pay 
                over a short period.
              </p>
              <p className="mb-4">
                FoodFlex is operated by Ohieku Agriplus Ltd, a company incorporated under the laws of 
                the Federal Republic of Nigeria.
              </p>
              <p className="mb-4 font-semibold">
                FoodFlex is not a bank, cooperative, or savings scheme.
              </p>

              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">2. ELIGIBILITY</h3>
              <p className="mb-2">To use FoodFlex, you must:</p>
              <ul className="list-disc pl-6 mb-4 space-y-1">
                <li>Be at least 18 years old</li>
                <li>Be resident in Nigeria</li>
                <li>Have a stable and verifiable source of income</li>
                <li>Successfully complete all required verification processes</li>
              </ul>
              <p className="mb-4">
                FoodFlex reserves the right to approve, decline, suspend, or revoke access at its discretion.
              </p>

              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">3. ACCOUNT REGISTRATION & VERIFICATION</h3>
              <p className="mb-2">Users must provide and consent to verification of:</p>
              <ul className="list-disc pl-6 mb-4 space-y-1">
                <li>Phone number</li>
                <li>BVN</li>
                <li>NIN</li>
                <li>Residential address</li>
                <li>Evidence of consistent income for the last six (6) months</li>
              </ul>
              <p className="mb-4">
                FoodFlex may verify addresses and financial information using third-party providers. 
                Any false or misleading information may result in immediate account termination.
              </p>

              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">4. CREDIT LIMIT & UPFRONT CONTRIBUTION</h3>
              <p className="mb-4">Approved users are assigned a credit limit.</p>
              <p className="mb-2">Before accessing credit:</p>
              <ul className="list-disc pl-6 mb-4 space-y-1">
                <li>Users must make a mandatory upfront contribution of 10% of the approved credit limit.</li>
                <li>The upfront contribution is not interest and is required to activate credit access.</li>
                <li>Failure to make the upfront contribution disqualifies the user from accessing credit.</li>
              </ul>
              <p className="mb-4">
                FoodFlex may increase, reduce, or withdraw credit limits based on repayment behaviour.
              </p>

              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">5. SHOPPING & ORDER PLACEMENT</h3>
              <ul className="list-disc pl-6 mb-4 space-y-1">
                <li>Users browse available items at fixed retail prices on the app.</li>
                <li>Orders must fall within the available credit limit.</li>
                <li>Multiple orders may be placed provided the total outstanding balance does not exceed the limit.</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">6. VOUCHER, OTP & TRANSACTION COMPLETION</h3>
              <p className="mb-2">Upon order confirmation:</p>
              <ul className="list-disc pl-6 mb-4 space-y-1">
                <li>FoodFlex generates a unique QR/Barcode voucher.</li>
                <li>The voucher can only be redeemed at approved independent suppliers.</li>
              </ul>
              
              <p className="font-semibold mb-2">OTP CONFIRMATION</p>
              <ul className="list-disc pl-6 mb-4 space-y-1">
                <li>The supplier scans the voucher.</li>
                <li>The customer provides a One-Time Password (OTP) generated on their device.</li>
                <li>Submission of the OTP constitutes confirmation that:
                  <ul className="list-circle pl-6 mt-1 space-y-1">
                    <li>Goods have been supplied</li>
                    <li>Goods have been received in satisfactory condition</li>
                    <li>The transaction is complete and final</li>
                  </ul>
                </li>
              </ul>
              
              <p className="mb-2">Once OTP is submitted:</p>
              <ul className="list-disc pl-6 mb-4 space-y-1">
                <li>The order cannot be cancelled</li>
                <li>The supplier becomes eligible for settlement</li>
                <li>The customer becomes fully liable for repayment</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">7. ORDER CANCELLATION</h3>
              <ul className="list-disc pl-6 mb-4 space-y-1">
                <li>Orders may be cancelled only before OTP submission</li>
                <li>Cancelled orders do not attract service fees</li>
                <li>Cancelled vouchers automatically expire</li>
                <li>No cancellations, refunds, or reversals are permitted after OTP confirmation.</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">8. SUPPLIERS</h3>
              <ul className="list-disc pl-6 mb-4 space-y-1">
                <li>Suppliers are independent merchants, not agents or employees of FoodFlex.</li>
                <li>FoodFlex does not handle or store goods.</li>
                <li>Suppliers are paid weekly for successfully completed transactions.</li>
                <li>FoodFlex is not liable for customer dissatisfaction arising from choices voluntarily made by the customer.</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">9. SERVICE FEE & REPAYMENT</h3>
              <ul className="list-disc pl-6 mb-4 space-y-1">
                <li>All utilised credit attracts an 8.5% service fee per 30-day cycle</li>
                <li>The service fee covers platform usage, credit facilitation, notifications, and transaction costs</li>
                <li>Service fees are non-refundable</li>
              </ul>
              
              <p className="font-semibold mb-2">Repayment Terms:</p>
              <ul className="list-disc pl-6 mb-4 space-y-1">
                <li>Repayment period: 30 days</li>
                <li>Grace period: 3–5 days</li>
                <li>Repayment is made via a dedicated virtual account</li>
                <li>Failure to repay within the grace period constitutes default.</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">10. DEFAULT & ENFORCEMENT</h3>
              <p className="mb-2">In the event of default, FoodFlex may:</p>
              <ul className="list-disc pl-6 mb-4 space-y-1">
                <li>Suspend or terminate the user account</li>
                <li>Freeze access to future credit</li>
                <li>Block platform access</li>
                <li>Engage recovery agents</li>
                <li>Report to credit bureaus</li>
                <li>Initiate legal proceedings</li>
              </ul>
              <p className="mb-4">
                Recovery costs may be borne by the user where permitted by law.
              </p>

              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">11. USER OBLIGATIONS</h3>
              <p className="mb-2">Users agree to:</p>
              <ul className="list-disc pl-6 mb-4 space-y-1">
                <li>Use the Platform lawfully</li>
                <li>Repay obligations on time</li>
                <li>Protect account credentials and OTPs</li>
                <li>Avoid fraud, misuse, or abuse of vouchers</li>
              </ul>
              <p className="mb-4">
                Any fraudulent activity may result in termination and legal action.
              </p>

              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">12. DATA PROTECTION & PRIVACY</h3>
              <p className="mb-4">
                FoodFlex processes personal data in compliance with the Nigeria Data Protection Act (NDPA).
              </p>
              <p className="mb-4">
                By using FoodFlex, users consent to lawful data processing for verification, credit assessment, 
                recovery, and regulatory purposes.
              </p>

              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">13. LIMITATION OF LIABILITY</h3>
              <p className="mb-2">FoodFlex shall not be liable for:</p>
              <ul className="list-disc pl-6 mb-4 space-y-1">
                <li>Supplier product quality issues</li>
                <li>Customer dissatisfaction after OTP confirmation</li>
                <li>Losses arising from misuse of vouchers or credentials</li>
                <li>System downtime beyond reasonable control</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">14. TERMINATION</h3>
              <p className="mb-2">FoodFlex may suspend or terminate access where:</p>
              <ul className="list-disc pl-6 mb-4 space-y-1">
                <li>These Terms are breached</li>
                <li>Fraud or misuse is suspected</li>
                <li>Required by law or regulation</li>
              </ul>
              <p className="mb-4">Outstanding repayment obligations survive termination.</p>

              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">15. GOVERNING LAW</h3>
              <p className="mb-4">
                These Terms are governed by the laws of the Federal Republic of Nigeria.
              </p>
              <p className="mb-4">
                Disputes shall be resolved exclusively in Nigerian courts.
              </p>

              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">16. AMENDMENTS</h3>
              <p className="mb-4">
                FoodFlex may update these Terms at any time. Continued use constitutes acceptance.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
            <button
              onClick={onClose}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              I Understand
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}