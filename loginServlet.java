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

                "2822"

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

    protected void doPost(

        HttpServletRequest req,

        HttpServletResponse res

    ) throws ServletException, IOException {

        String email =
        req.getParameter("email");

        String password =
        req.getParameter("password");

        try {

            // Hash entered password
            String hashedPassword =
            hashPassword(password);

            PreparedStatement ps =
            con.prepareStatement(

            "SELECT * FROM users WHERE email=? AND password=?"

            );

            ps.setString(1, email);

            ps.setString(2, hashedPassword);

            ResultSet rs =
            ps.executeQuery();

            if(rs.next()) {

                res.sendRedirect("index.html");

            }

            else {

    res.getWriter().println(

    "<script>" +

    "alert('Invalid Email or Password');" +

    "window.location='auth.html';" +

    "</script>"

    );

}
        }

        catch(Exception e) {

            res.getWriter().println(e);

        }

    }

}