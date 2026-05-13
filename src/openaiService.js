export const analyzeImage = async (imageBase64) => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/analyze', {
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
      // Try to get the server's error message for better feedback
      let serverMessage = 'Erro na resposta do servidor';
      try {
        const errData = await response.json();
        serverMessage = errData.error || serverMessage;
      } catch (e) { /* ignore parse error */ }
      const err = new Error(serverMessage);
      err.serverMessage = serverMessage;
      throw err;
    }

    return await response.json();
  } catch (error) {
    console.error("Error calling backend API:", error);
    throw error;
  }
};
