FROM tomcat:9.0-jdk17

# Remove default ROOT application
RUN rm -rf /usr/local/tomcat/webapps/ROOT/*

# Create uploads folder with full permissions
RUN mkdir -p /uploads && chmod 777 /uploads

# Copy application files to Tomcat ROOT
COPY . /usr/local/tomcat/webapps/ROOT/

# Expose Tomcat default port
EXPOSE 8080

CMD ["catalina.sh", "run"]
