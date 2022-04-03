/// <reference types="cypress" />

const matt = {
  username: "matt",
  email: "matt@example.com",
  password: "Z6#6%xfLTarZ9U",
};
const rob = {
  username: "rob",
  email: "rob@example.com",
  password: "L%e$xZHC4QKP@F",
};

describe("Feature: Read Status Messages", () => {
  it("setup", () => {
    cy.signup(matt.username, matt.email, matt.password);
    cy.logout();
    cy.signup(rob.username, rob.email, rob.password);
    cy.logout();
  });

  it("no new messages in new conversation", () => {
    cy.login(matt.username, matt.password);

    cy.get("input[name=search]").type("rob");
    cy.contains("div", "rob")
      .parent()
      .within(($rob) => {
        cy.wrap($rob).next().should("not.exist");
        cy.wrap($rob).click();
      });

    cy.get("input[name=text]").type("First message{enter}");
    cy.get("input[name=text]").type("Second message{enter}");
    cy.get("input[name=text]").type("Third message{enter}");

    cy.contains("First message");
    cy.contains("Second message");
    cy.contains("Third message");

    //still no new messages
    cy.contains("div", "rob").parent().next().should("not.exist");
  });

  it("new messages exist for another user", () => {
    cy.login(rob.username, rob.password);

    //three new messages
    cy.contains("div", "matt")
      .parent()
      .within(($matt) => {
        cy.wrap($matt).next().should("contain", 3);
        cy.wrap($matt).click();
      });

    //messages read
    cy.contains("div", "matt").parent().next().should("not.exist");
  });

  it("read messages have another user's avatar", () => {
    cy.login(matt.username, matt.password);

    cy.get("input[name=search]").type("rob");
    cy.contains("rob").click();

    cy.contains("First message").then(() => {
      // Select the message list DOM by finding the closest common ancestor
      // between two messages.
      const $firstMessage = Cypress.$(':contains("First message")');
      const $secondMessage = Cypress.$(':contains("Second message")');
      const $list = $firstMessage.parents().has($secondMessage).first();
      cy.wrap($list)
        .children()
        .eq(2)
        .children()
        .eq(2)
        .should(($div) => {
          const className = $div[0].className;
          expect(className).to.match(/Avatar/);
        });
    });

    cy.get("input[name=text]").type("Fourth message{enter}");
    cy.get("input[name=text]").type("Fifth message{enter}");
    cy.get("input[name=text]").type("Sixth message{enter}");

    cy.contains("First message").then(() => {
      // Select the message list DOM by finding the closest common ancestor
      // between two messages.
      const $firstMessage = Cypress.$(':contains("First message")');
      const $secondMessage = Cypress.$(':contains("Second message")');
      const $list = $firstMessage.parents().has($secondMessage).first();
      cy.wrap($list)
        .children()
        .eq(2)
        .children()
        .eq(2)
        .should(($div) => {
          const className = $div[0].className;
          expect(className).to.match(/Avatar/);
        });
    });
  });
});
