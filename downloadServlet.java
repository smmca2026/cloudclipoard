import java.io.*;
import javax.servlet.*;
import javax.servlet.http.*;

public class downloadServlet
extends HttpServlet {

    protected void doGet(
        HttpServletRequest req,
        HttpServletResponse res
    ) throws ServletException, IOException {

        String projectPath =
        getServletContext()
        .getRealPath("");

        BufferedReader br =
        new BufferedReader(
        new FileReader(
        projectPath +
        "latest.txt"));

        String fileName =
        br.readLine();

        br.close();

        String path =
        "C:/uploads/";

        File file =
        new File(path + fileName);

        if(!file.exists()) {

            res.getWriter()
            .write("File Not Found");

            return;
        }

        res.setContentType(
        "application/octet-stream"
        );

        res.setHeader(
        "Content-Disposition",
        "attachment; filename=\""
        + file.getName() + "\""
        );

        FileInputStream fis =
        new FileInputStream(file);

        OutputStream os =
        res.getOutputStream();

        byte[] buffer =
        new byte[4096];

        int bytesRead;

        while((bytesRead =
        fis.read(buffer)) != -1) {

            os.write(
            buffer,
            0,
            bytesRead);

        }

        fis.close();
        os.close();
    }
}