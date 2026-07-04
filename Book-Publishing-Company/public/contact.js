$(document).ready(function () {

    // FAQ Accordion
    $("#accordion").accordion({
        collapsible: true,
        heightStyle: "content"
    });

    // Form Validation
    $("#contactForm").validate({
        rules: {
            name: {
                required: true,
                minlength: 3
            },
            email: {
                required: true,
                email: true
            },
            subject: {
                required: true,
                minlength: 5
            },
            message: {
                required: true,
                minlength: 10
            }
        },

        messages: {
            name: {
                required: "Please enter your name",
                minlength: "Name must contain at least 3 characters"
            },

            email: {
                required: "Please enter your email",
                email: "Enter a valid email address"
            },

            subject: {
                required: "Please enter subject",
                minlength: "Subject is too short"
            },

            message: {
                required: "Please enter your message",
                minlength: "Message should contain at least 10 characters"
            }
        },

        submitHandler: function (form) {

            const submitBtn = $("#form-button");

            submitBtn.prop("disabled", true);
            submitBtn.text("Sending...");

            $.ajax({
                url: "http://localhost:3001/contact",
                type: "POST",
                contentType: "application/json",

                data: JSON.stringify({
                    name: $("input[name='name']").val(),
                    email: $("input[name='email']").val(),
                    subject: $("input[name='subject']").val(),
                    message: $("textarea[name='message']").val()
                }),

                success: function (response) {

                    $("#responseMessage")
                        .html(" Message sent successfully!")
                        .css({
                            color: "green",
                            marginTop: "10px"
                        });

                    $("#contactForm")[0].reset();

                    submitBtn.prop("disabled", false);
                    submitBtn.text("Send Message");
                },

                error: function () {

                    $("#responseMessage")
                        .html("❌ Failed to send message.")
                        .css({
                            color: "red",
                            marginTop: "10px"
                        });

                    submitBtn.prop("disabled", false);
                    submitBtn.text("Send Message");
                }
            });
        }
    });

});