import java.io.*;
import javax.servlet.*;
import javax.servlet.http.*;
import java.sql.*;
import java.security.MessageDigest;

public class signupServlet extends HttpServlet {

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

    // HASH PASSWORD
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

    protected void doPost(

        HttpServletRequest req,

        HttpServletResponse res

    ) throws ServletException, IOException {

        String email =
        req.getParameter("email");

        String password =
        req.getParameter("password");

        try {

            // CHECK EMAIL EXISTS
            PreparedStatement check =
            con.prepareStatement(

            "SELECT * FROM users WHERE email=?"

            );

            check.setString(1, email);

            ResultSet rs =
            check.executeQuery();

            String acceptHeader = req.getHeader("Accept");
            String requestedWith = req.getHeader("X-Requested-With");
            boolean isAjax = (acceptHeader != null && acceptHeader.contains("application/json")) || "XMLHttpRequest".equals(requestedWith);

            // EMAIL ALREADY EXISTS
            if(rs.next()) {
                if(isAjax) {
                    res.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                    res.setContentType("application/json");
                    res.setCharacterEncoding("UTF-8");
                    res.getWriter().print("{\"success\":false,\"message\":\"Email is already registered! Please log in.\"}");
                } else {
                    String encodedEmail = java.net.URLEncoder.encode(email != null ? email : "", "UTF-8");
                    res.sendRedirect("auth.html?error=email_exists&email=" + encodedEmail + "&tab=signup");
                }
            } else {
                // HASH PASSWORD
                String hashedPassword = hashPassword(password);

                PreparedStatement ps = con.prepareStatement(
                    "INSERT INTO users(email,password) VALUES(?,?)"
                );
                ps.setString(1, email);
                ps.setString(2, hashedPassword);
                ps.executeUpdate();

                if(isAjax) {
                    res.setContentType("application/json");
                    res.setCharacterEncoding("UTF-8");
                    res.getWriter().print("{\"success\":true,\"message\":\"🎉 Account created successfully! Please log in.\"}");
                } else {
                    String encodedEmail = java.net.URLEncoder.encode(email != null ? email : "", "UTF-8");
                    res.sendRedirect("auth.html?signup=success&email=" + encodedEmail);
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
                res.sendRedirect("auth.html?error=db_error&tab=signup");
            }
        }
    }
}