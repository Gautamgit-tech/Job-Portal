import { createMuiTheme } from "@material-ui/core/styles";

const theme = createMuiTheme({
  palette: {
    primary: { main: "#c21783", light: "#f22b65", dark: "#46166b" },
    secondary: { main: "#176b87" },
    background: { default: "#f4f7f9", paper: "#ffffff" },
    text: { primary: "#102a43", secondary: "#52606d" },
  },
  typography: {
    fontFamily: "'Poppins', 'Roboto', sans-serif",
    h3: { fontWeight: 800 },
    h4: { fontWeight: 800 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
  },
  shape: { borderRadius: 12 },
  overrides: {
    MuiButton: { root: { textTransform: "none", borderRadius: 10, fontWeight: 600 } },
    MuiAppBar: { colorPrimary: { background: "linear-gradient(120deg, #46166b 0%, #c21783 100%)" } },
    MuiChip: { root: { borderRadius: 8 } },
  },
});

export default theme;