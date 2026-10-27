import axios from "axios";
import { server } from "./apiList";

export const openResume = async (resumePath) => {
  const popup = window.open("about:blank", "_blank");
  try {
    const response = await axios.get(`${server}${resumePath}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      responseType: "blob",
    });
    const url = URL.createObjectURL(response.data);
    if (popup) popup.location = url;
    else window.open(url, "_blank");
  } catch (error) {
    if (popup) popup.close();
    throw error;
  }
};
