import { createContext, useContext } from 'react';

export interface LoginPopupContextType {
    showLoginPopup: () => void;
}

export const LoginPopupContext = createContext<LoginPopupContextType | null>(null);

export function useLoginPopup() {
    const context = useContext(LoginPopupContext);
    if (!context) {
        throw new Error('useLoginPopup must be used within LoginPopupProvider');
    }
    return context;
}
