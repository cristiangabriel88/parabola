(function ($) {
  "use strict";

  var fullHeight = function () {
    $(".js-fullheight").css("height", $(window).height());
    $(window).resize(function () {
      $(".js-fullheight").css("height", $(window).height());
    });
  };
  fullHeight();

  var carousel = function () {
    $(".featured-carousel").owlCarousel({
      loop: false,
      autoplay: false,
      margin: 5,
      animateOut: "fadeOut",
      animateIn: "fadeIn",
      startPosition: 0,
      nav: true,
      dots: false,
      autoplayHoverPause: false,
      items: 1,
      navText: [
        "<span class='ion-ios-arrow-back'></span>",
        "<span class='ion-ios-arrow-forward'></span>",
      ],
      responsive: {
        0: {
          items: 1, // 1 card on smaller screens
        },
        768: {
          items: 2, // 2 cards on medium screens
        },
        1024: {
          items: 3, // 3 cards on larger screens
        },
        1440: {
          items: 4, // 4 cards on very large screens
        },
      },
      onInitialized: updateNavButtons, // Add this
      onChanged: updateNavButtons, // Add this
    });

    // Function to hide/show navigation arrows
    function updateNavButtons(event) {
      var currentIndex = event.item.index; // Current position
      var itemCount = event.item.count; // Total items

      // Get navigation buttons
      var prevButton = $(".featured-carousel .owl-prev");
      var nextButton = $(".featured-carousel .owl-next");

      // Hide/show previous button
      if (currentIndex === 0) {
        prevButton.hide(); // Hide at the start
      } else {
        prevButton.show(); // Show otherwise
      }

      // Hide/show next button
      if (currentIndex + event.page.size >= itemCount) {
        nextButton.hide(); // Hide at the end
      } else {
        nextButton.show(); // Show otherwise
      }
    }
  };
  carousel();
})(jQuery);
