const html = `<link rel="stylesheet" href="/eBook/main.css" />
<button class="open">menu</button>
<dialog id="menu">
    <button class="close">close</button>
    <ul>
        <h4>Books</h4>
    </ul>
    <form id="settings">
        <h4>Settings</h4>
        <label><input type="color" name="background-color" /> - background color</label>
        <label><input type="color" name="color" value="#ffffff" /> - font color</label>
        <label><input type="number" name="font-size" value="16" /> - font size</label>
        <label><input type="number" name="line-height" value="24" /> - line height</label>
        <label><input type="number" name="letter-spacing" value="1" /> - letter spacing</label>
    </form>
</dialog>
<section>reading area</section>`;
const template = document.createElement("template");
template.innerHTML = html;

class EBook extends HTMLElement {
    constructor() {
        super();
        this.indexUrl = this.dataset.indexUrl || "/books/index.json";
        this.dialog = template.content.querySelector("dialog");
        this.section = template.content.querySelector("section");
        this.menu = template.content.getElementById("menu");
        this.settings = template.content.getElementById("settings");

        for (let element of this.settings.elements) {
            this.prop(this.style, element);

            element.addEventListener("change", (event) => {
                this.prop(this.style, event.target, true);
            });
        }

        const shadow = this.attachShadow({ mode: "open" });
        shadow.appendChild(template.content);
    }

    /**
     * @param {*} style
     * @param {*} element
     * @param {*} user
     */
    prop(style, element, user) {
        const px = ["font-size", "line-height", "letter-spacing"];
        const name = `--setting-${element.name}`;
        const cache = localStorage.getItem(name);
        let value = `${element.value}${px.includes(element.name) ? "px" : ""}`;

        if (cache && !user) {
            value = cache;
            element.value = px.includes(element.name)
                ? cache.slice(0, -2)
                : cache;
        }

        if (user) {
            localStorage.setItem(name, value);
        }

        style.setProperty(name, value);
    }

    async connectedCallback() {
        const response = await fetch(this.indexUrl);
        const books = await response.json();

        for (let book of books) {
            let element = document.createElement("li");
            element.setAttribute("data-path", book.path);
            element.innerText = `"${book.name}" by ${book.author}`;
            element.addEventListener("click", this.renderBook);
            this.dialog.querySelector("ul").appendChild(element);
        }

        const book = localStorage.getItem("reading-book");
        const line = localStorage.getItem("reading-line");

        if (book) {
            this.dialog.querySelector(`[data-path="${book}"]`).dispatchEvent(
                new MouseEvent("click"),
            );
        }

        if (line) {
            setTimeout(() => {
                const element = this.section.querySelector(
                    `[data-line="${line}"]`,
                );
                element.scrollIntoView();
                element.classList.add("last-read");
            }, 0);
        }

        this.shadowRoot.querySelector(".open").addEventListener(
            "click",
            (event) => {
                this.menu.showModal();
            },
        );

        this.shadowRoot.querySelector(".close").addEventListener(
            "click",
            (event) => {
                this.menu.close();
            },
        );
    }

    renderBook = async (event) => {
        console.log("loading in progress");
        this.section.replaceChildren();
        const path = event.currentTarget.dataset.path;
        const book = await this.getBook(path);

        for (let line in book.lines) {
            const element = document.createElement("div");
            element.classList.add("line");
            element.setAttribute("data-line", line);
            element.innerText = book.lines[line];
            this.linesObserver.observe(element);
            this.section.appendChild(element);
        }
        // TODO mark book
        localStorage.setItem("reading-book", path);
        // localStorage.setItem('reading-line', 1);
        console.log("loading complete");
    };

    /**
     * 
     * @param {*} url 
     * @returns 
     */
    async getBook(url) {
        let book = JSON.parse(localStorage.getItem("cache" + url));

        if (book === null) {
            const response = await fetch(url);
            book = await response.json();
            localStorage.setItem("cache" + url, JSON.stringify(book));
        }

        return book;
    }

    linesObserver = new IntersectionObserver((entries, _observer) => {
        entries.forEach((entry) => {
            if (
                !entry.isVisible && !entry.isIntersecting &&
                entry.boundingClientRect.top < 0
            ) {
                localStorage.setItem(
                    "reading-line",
                    entry.target.getAttribute("data-line"),
                );
            }
        });
    }, { rootMargin: "0px", threshold: 0.9 });
}

customElements.define("e-book", EBook);
