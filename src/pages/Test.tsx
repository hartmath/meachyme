export default function Test() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#f3f4f6',
      flexDirection: 'column',
      gap: '1rem'
    }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>Test Page</h1>
      <p style={{ fontSize: '1.2rem' }}>If you can see this, the basic app is working!</p>
      <button 
        onClick={() => console.log('Test button clicked!')}
        style={{
          padding: '0.75rem 1.5rem',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '0.5rem',
          cursor: 'pointer',
          fontSize: '1rem'
        }}
      >
        Test Button
      </button>
    </div>
  );
}
