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

                "2822"

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

            res.setContentType("text/html");

            PrintWriter out =
            res.getWriter();

            // EMAIL ALREADY EXISTS
            if(rs.next()) {

                out.println(

                "<script>" +

                "alert('Email already exists');" +

                "window.location='auth.html';" +

                "</script>"

                );

            }

            else {

                // HASH PASSWORD
                String hashedPassword =
                hashPassword(password);

                PreparedStatement ps =
                con.prepareStatement(

                "INSERT INTO users(email,password) VALUES(?,?)"

                );

                ps.setString(1, email);

                ps.setString(2, hashedPassword);

                ps.executeUpdate();

                out.println(

                "<script>" +

                "alert('Signup Successful');" +

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