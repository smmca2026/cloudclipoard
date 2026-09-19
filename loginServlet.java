import java.io.*;
import javax.servlet.*;
import javax.servlet.http.*;
import java.sql.*;
import java.security.MessageDigest;

public class loginServlet extends HttpServlet {

    Connection con;

    public void init() {

        try {

            Class.forName(
                "com.mysql.cj.jdbc.Driver"
            );

            con = DriverManager.getConnection(

                "jdbc:mysql://localhost:3306/cloudclipboard",

                "root",

                "Digi@2024"

            );

        }

        catch(Exception e) {

            e.printStackTrace();

        }

    }

    // Password Hash Method
    private String hashPassword(
    String password) {

        try {

            MessageDigest md =
            MessageDigest.getInstance("SHA-256");

            byte[] hash =
            md.digest(password.getBytes());

            StringBuilder sb =
            new StringBuilder();

            for(byte b : hash) {

                sb.append(
                String.format("%02x", b)
                );

            }

            return sb.toString();

        }

        catch(Exception e) {
            return null;
        }
    }

    // Helper to extract field from JSON string
    private String extractJsonField(String json, String field) {
        if (json == null) return null;
        java.util.regex.Pattern p = java.util.regex.Pattern.compile("\"" + field + "\"\\s*:\\s*\"([^\"]+)\"");
        java.util.regex.Matcher m = p.matcher(json);
        if (m.find()) return m.group(1);
        return null;
    }

    protected void doPost(
        HttpServletRequest req,
        HttpServletResponse res
    ) throws ServletException, IOException {

        String email = req.getParameter("email");
        String password = req.getParameter("password");

        if (email == null || password == null) {
            try {
                StringBuilder sb = new StringBuilder();
                BufferedReader reader = req.getReader();
                String line;
                while ((line = reader.readLine()) != null) {
                    sb.append(line);
                }
                String body = sb.toString();
                if (email == null) email = extractJsonField(body, "email");
                if (password == null) password = extractJsonField(body, "password");
            } catch(Exception ignored) {}
        }

        try {
            // Hash entered password
            String hashedPassword = hashPassword(password);

            PreparedStatement ps = con.prepareStatement(

            "SELECT * FROM users WHERE email=? AND password=?"

            );

            ps.setString(1, email);

            ps.setString(2, hashedPassword);

            ResultSet rs =
            ps.executeQuery();

            String acceptHeader = req.getHeader("Accept");
            String requestedWith = req.getHeader("X-Requested-With");
            boolean isAjax = (acceptHeader != null && acceptHeader.contains("application/json")) || "XMLHttpRequest".equals(requestedWith);

            if(rs.next()) {
                HttpSession session = req.getSession();
                session.setAttribute("email", email);

                if(isAjax) {
                    res.setContentType("application/json");
                    res.setCharacterEncoding("UTF-8");
                    res.getWriter().print("{\"success\":true,\"redirect\":\"index.html\",\"message\":\"Login successful!\"}");
                } else {
                    res.sendRedirect("index.html");
                }
            } else {
                if(isAjax) {
                    res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    res.setContentType("application/json");
                    res.setCharacterEncoding("UTF-8");
                    res.getWriter().print("{\"success\":false,\"message\":\"Invalid Email or Password. Please try again.\"}");
                } else {
                    String encodedEmail = java.net.URLEncoder.encode(email != null ? email : "", "UTF-8");
                    res.sendRedirect("auth.html?error=invalid_password&email=" + encodedEmail);
                }
            }
        } catch(Exception e) {
            String acceptHeader = req.getHeader("Accept");
            if (acceptHeader != null && acceptHeader.contains("application/json")) {
                res.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                res.setContentType("application/json");
                res.setCharacterEncoding("UTF-8");
                res.getWriter().print("{\"success\":false,\"message\":\"Database Error: " + e.getMessage() + "\"}");
            } else {
                res.sendRedirect("auth.html?error=db_error");
            }
        }
    }
}