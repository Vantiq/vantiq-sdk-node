var   fs = require('fs');
var uuid = require('node-uuid');

function VantiqMultipart(fileName, contentType, documentPath) {
    this.fileName     = fileName;
    this.contentType  = contentType;
    this.documentPath = documentPath;

    this.DASHES   = '--';
    this.NEWLINE  = '\r\n';
    this.BOUNDARY = uuid.v1();
}

VantiqMultipart.prototype.upload = function(stream) {
    return new Promise((resolve, reject) => {
        try {
            // Write out header
            stream.write(this.DASHES);
            stream.write(this.BOUNDARY);
            stream.write(this.NEWLINE);

            stream.write('Content-Disposition: ');
            stream.write(this.getContentDisposition());
            stream.write(this.NEWLINE);

            stream.write('Content-Type: ');
            stream.write(this.getContentType());
            stream.write(this.NEWLINE);

            stream.write(this.NEWLINE);

            // Stream file
            var reader = fs.createReadStream(this.fileName);
            reader.on('data', (chunk) => {
                stream.write(chunk);
            });

            reader.on('end', () => {
                stream.write(this.NEWLINE);

                stream.write(this.DASHES);
                stream.write(this.BOUNDARY);
                stream.write(this.DASHES);
                stream.write(this.NEWLINE);

                resolve();
            });

            reader.on('error', (err) => {
                reject(err);
            });

        } catch(e) {
            reject(e);
        }
    });
};

VantiqMultipart.prototype.getContentDisposition = function() {
    return 'form-data; name="defaultName"; filename="' + this.documentPath + '"';
};

VantiqMultipart.prototype.getContentType = function() {
    return this.contentType;
};

VantiqMultipart.prototype.getMultipartContentType = function() {
    return 'multipart/form-data; boundary=' + this.BOUNDARY;
};

module.exports = VantiqMultipart;