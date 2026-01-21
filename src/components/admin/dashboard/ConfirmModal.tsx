/**
 * ConfirmModal - Generic reusable confirmation dialog for dangerous actions
 */

export interface ConfirmModalProps {
  title: string;
  message: string;
  details?: string[];
  confirmText?: string;
  confirmColor?: 'red' | 'gray';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  title,
  message,
  details,
  confirmText = 'Confirm',
  confirmColor = 'red',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const iconColor = confirmColor === 'red' ? 'text-red-700' : 'text-gray-700';
  const iconBg = confirmColor === 'red' ? 'bg-red-100' : 'bg-gray-100';
  const buttonBg = confirmColor === 'red' ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 hover:bg-gray-700';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className={`flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 ${iconBg} rounded-full flex items-center justify-center`}>
              <svg className={`w-4 h-4 sm:w-5 sm:h-5 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-black">{title}</h3>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">{message}</p>
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-6">
          {details && details.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200 mb-4 sm:mb-6">
              {details.map((detail, index) => (
                <p key={index} className={`text-xs sm:text-sm ${detail.startsWith('•') ? 'text-gray-700 ml-2' : detail === '' ? 'h-2' : 'text-black font-medium'}`}>
                  {detail}
                </p>
              ))}
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onConfirm}
              className={`flex-1 ${buttonBg} text-brand-white px-4 py-2.5 sm:py-3 rounded-lg text-sm sm:text-base font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${confirmColor}-500 transition-all cursor-pointer`}
            >
              {confirmText}
            </button>
            <button
              onClick={onCancel}
              className="flex-1 bg-white border border-gray-300 text-black px-4 py-2.5 sm:py-3 rounded-lg text-sm sm:text-base font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
