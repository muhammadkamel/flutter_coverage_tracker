/**
 * Shared webview UI components for test runner views
 */

export class WebviewComponents {
    /**
     * Returns CSS styles for the scroll-to-top button
     */
    public static getScrollToTopStyles(): string {
        return `
        /* Scroll to Top Button */
        #scroll-to-top {
            position: fixed;
            bottom: 24px;
            right: 24px;
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
            z-index: 1000;
        }
        #scroll-to-top.show {
            opacity: 1;
            visibility: visible;
        }
        #scroll-to-top:hover {
            transform: translateY(-4px);
            box-shadow: 0 6px 16px rgba(99, 102, 241, 0.6);
        }
        #scroll-to-top:active {
            transform: translateY(-2px);
        }`;
    }

    /**
     * Returns HTML for the scroll-to-top button
     */
    public static getScrollToTopButton(): string {
        return `
    <!-- Scroll to Top Button -->
    <button id="scroll-to-top" title="Scroll to top">
        <svg width="24" height="24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 15l-6-6-6 6"></path>
        </svg>
    </button>`;
    }

    /**
     * Returns JavaScript logic for the scroll-to-top button
     */
    public static getScrollToTopScript(): string {
        return `
        // Scroll to Top Functionality
        const scrollToTopBtn = document.getElementById('scroll-to-top');
        
        window.addEventListener('scroll', () => {
            if (window.pageYOffset > 300) {
                scrollToTopBtn.classList.add('show');
            } else {
                scrollToTopBtn.classList.remove('show');
            }
        });
        
        scrollToTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });`;
    }
}
