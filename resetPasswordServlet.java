import java.io.*;
import java.sql.*;
import javax.servlet.*;
import javax.servlet.http.*;

public class resetPasswordServlet extends HttpServlet {

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

            "2822"

            );

        }

        catch(Exception e) {

            e.printStackTrace();

        }

    }

    protected void doPost(

        HttpServletRequest req,

        HttpServletResponse res

    ) throws ServletException, IOException {

        String newPassword =
        req.getParameter("newPassword");

        HttpSession session =
        req.getSession();

        String email =
        (String)
        session.getAttribute("email");

        try {

            PreparedStatement ps =
            con.prepareStatement(

            "UPDATE users SET password=? WHERE email=?"

            );

            ps.setString(
            1,
            newPassword
            );

            ps.setString(
            2,
            email
            );

            int rows =
            ps.executeUpdate();

            if(rows > 0) {

                res.getWriter().println(

                "<script>" +

                "alert('Password Updated Successfully');" +

                "window.location='auth.html';" +

                "</script>"

                );

            }

            else {

    res.getWriter().println(

    "<script>" +

    "alert('Invalid Email');" +

    "window.location='forgot.html';" +

    "</script>"

    );

}

        }

        catch(Exception e) {

            res.getWriter().println(e);

        }

    }

}