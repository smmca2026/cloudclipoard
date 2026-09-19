import java.io.*;
import java.sql.*;
import javax.servlet.*;
import javax.servlet.http.*;
import java.security.MessageDigest;

public class resetPasswordServlet extends HttpServlet {
    private static final long serialVersionUID = 1L;

    Connection con;

    public void init() {

        try {

            Class.forName(
            "com.mysql.cj.jdbc.Driver"
            );

            con =
            DriverManager.getConnection(

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
    private String hashPassword(String password) {

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

        String newPassword = req.getParameter("newPassword");

        if (newPassword == null) {
            try {
                StringBuilder sb = new StringBuilder();
                BufferedReader reader = req.getReader();
                String line;
                while ((line = reader.readLine()) != null) {
                    sb.append(line);
                }
                String body = sb.toString();
                newPassword = extractJsonField(body, "newPassword");
            } catch(Exception ignored) {}
        }

        HttpSession session =
        req.getSession();

        String email =
        (String)
        session.getAttribute("email");

        try {

            String hashedPassword =
            hashPassword(newPassword);

            PreparedStatement ps =
            con.prepareStatement(

            "UPDATE users SET password=? WHERE email=?"

            );

            ps.setString(
            1,
            hashedPassword
            );

            ps.setString(
            2,
            email
            );

            int rows = ps.executeUpdate();

            String acceptHeader = req.getHeader("Accept");
            String requestedWith = req.getHeader("X-Requested-With");
            boolean isAjax = (acceptHeader != null && acceptHeader.contains("application/json")) || "XMLHttpRequest".equals(requestedWith);

            if(rows > 0) {
                if(isAjax) {
                    res.setContentType("application/json");
                    res.setCharacterEncoding("UTF-8");
                    res.getWriter().print("{\"success\":true,\"message\":\"Password Updated Successfully! Please log in.\",\"redirect\":\"auth.html\"}");
                } else {
                    res.sendRedirect("auth.html?msg=" + java.net.URLEncoder.encode("Password Updated Successfully! Please login.", "UTF-8"));
                }
            } else {
                if(isAjax) {
                    res.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                    res.setContentType("application/json");
                    res.setCharacterEncoding("UTF-8");
                    res.getWriter().print("{\"success\":false,\"message\":\"Invalid Email or Session Expired.\"}");
                } else {
                    res.sendRedirect("forgot.html?error=invalid_email");
                }
            }
        } catch(Exception e) {
            String acceptHeader = req.getHeader("Accept");
            if (acceptHeader != null && acceptHeader.contains("application/json")) {
                res.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                res.setContentType("application/json");
                res.setCharacterEncoding("UTF-8");
                res.getWriter().print("{\"success\":false,\"message\":\"" + e.getMessage() + "\"}");
            } else {
                res.sendRedirect("forgot.html?error=failed");
            }
        }
    }
}