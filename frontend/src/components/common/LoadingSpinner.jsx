/**
 * Loading Spinner Component
 */

const LoadingSpinner = ({ size = 'md', text = 'Loading...' }) => {
    const sizeMap = {
        sm: { width: 24, height: 24, borderWidth: 2 },
        md: { width: 40, height: 40, borderWidth: 3 },
        lg: { width: 64, height: 64, borderWidth: 4 }
    };

    const s = sizeMap[size] || sizeMap.md;

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            padding: '48px 0',
        }}>
            <div
                style={{
                    width: s.width,
                    height: s.height,
                    borderRadius: '50%',
                    border: `${s.borderWidth}px solid rgba(99, 102, 241, 0.2)`,
                    borderTopColor: '#6366f1',
                    animation: 'spin 0.8s linear infinite',
                }}
            />
            {text && (
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{text}</p>
            )}
        </div>
    );
};

export default LoadingSpinner;
