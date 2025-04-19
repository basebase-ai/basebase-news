const fetchStories = async () => {
  try {
    setLoading(true);
    const response = await fetch(`/api/stories/${sourceId}`);
    if (!response.ok) {
      throw new Error("Failed to fetch stories");
    }
    const data = await response.json();
    setStories(data);
  } catch (error) {
    setError("Failed to load stories");
  } finally {
    setLoading(false);
  }
}; 