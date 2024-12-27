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
      loop: true,
      autoplay: false,
      margin: 5,
      animateOut: "fadeOut",
      animateIn: "fadeIn",
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
          items: 2, // 3 cards on larger screens
        },
        1440: {
          items: 3, // 4 cards on very large screens
        },
      },
    });
  };
  carousel();
})(jQuery);
