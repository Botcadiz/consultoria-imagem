export const analyzeImage = async (imageBase64) => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('http://localhost:3001/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ imageBase64 })
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('401');
      }
      throw new Error('Erro na resposta do servidor');
    }

    return await response.json();
  } catch (error) {
    console.error("Error calling backend API:", error);
    throw error;
  }
};
