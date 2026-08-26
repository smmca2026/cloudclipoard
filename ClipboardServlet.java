import java.io.*;
import javax.servlet.*;
import javax.servlet.http.*;
import java.sql.*;

public class ClipboardServlet extends HttpServlet {

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

    protected void doPost(

        HttpServletRequest req,

        HttpServletResponse res

    ) throws ServletException, IOException {

        String content =
        req.getParameter("text");

        try {

            Statement st =
            con.createStatement();

            st.executeUpdate(
            "DELETE FROM clipboard"
            );

            PreparedStatement ps =
            con.prepareStatement(
            "INSERT INTO clipboard(content) VALUES(?)"
            );

            ps.setString(1, content);

            ps.executeUpdate();

            res.getWriter().write(
            "Saved Successfully"
            );

        }

        catch(Exception e) {

            e.printStackTrace();

        }

    }

    protected void doGet(

        HttpServletRequest req,

        HttpServletResponse res

    ) throws ServletException, IOException {

        try {

            Statement st =
            con.createStatement();

            ResultSet rs =
            st.executeQuery(
            "SELECT * FROM clipboard ORDER BY id DESC LIMIT 1"
            );

            PrintWriter out =
            res.getWriter();

            if(rs.next()) {

                out.print(
                rs.getString("content")
                );

            }

        }

        catch(Exception e) {

            e.printStackTrace();

        }

    }

}