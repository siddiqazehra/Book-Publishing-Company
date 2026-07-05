/* BEGIN: Book Search & Cart Feature - shared book catalog data
   NOTE: entries 4-13 are placeholder data (price/popularity/description/image
   invented, images reused from existing covers) — swap in real details and
   real cover images whenever ready. */
const BOOKS = [
    {
        id: 1,
        title: "Pride and Prejudice",
        author: "Jane Austen",
        price: 25.00,
        popularity: 2400,
        image: "images/book-1.jfif",
        description: "A witty tale of manners, misunderstandings and love in Georgian England, following Elizabeth Bennet as she navigates family expectations and her own pride."
    },
    {
        id: 2,
        title: "The Hound of the Baskervilles",
        author: "Sir Arthur Conan Doyle",
        price: 25.00,
        popularity: 1800,
        image: "images/book-2.jpg",
        description: "Sherlock Holmes investigates a supposed curse haunting the Baskerville family on the Devon moors in one of detective fiction's most atmospheric mysteries."
    },
    {
        id: 3,
        title: "Dracula",
        author: "Bram Stoker",
        price: 25.00,
        popularity: 2100,
        image: "images/book-3.jfif",
        description: "The classic gothic horror novel that introduced Count Dracula, told through letters and diary entries as a group race to stop his reign of terror."
    },
    {
        id: 4,
        title: "Great Expectations",
        author: "Charles Dickens",
        price: 22.00,
        popularity: 1500,
        image: "images/book1.jpg",
        description: "Orphan Pip's journey from humble beginnings to unexpected wealth, and the mysterious benefactor who changes the course of his life."
    },
    {
        id: 5,
        title: "The Picture of Dorian Gray",
        author: "Oscar Wilde",
        price: 23.50,
        popularity: 1950,
        image: "images/book3.jpg",
        description: "A young man's portrait ages and bears the marks of his sins while he himself remains young, in Wilde's only novel and a landmark of gothic fiction."
    },
    {
        id: 6,
        title: "Frankenstein",
        author: "Mary Shelley",
        price: 21.00,
        popularity: 1700,
        image: "images/book4.jpg",
        description: "Victor Frankenstein creates life from death and must reckon with the consequences of playing creator in this founding work of science fiction."
    },
    {
        id: 7,
        title: "Moby-Dick",
        author: "Herman Melville",
        price: 27.00,
        popularity: 900,
        image: "images/book5.jpg",
        description: "Captain Ahab's obsessive pursuit of the great white whale, narrated by Ishmael in a sweeping tale of the sea and the limits of human will."
    },
    {
        id: 8,
        title: "Jane Eyre",
        author: "Charlotte Bronte",
        price: 24.00,
        popularity: 2050,
        image: "images/book6.jpg",
        description: "An orphaned governess finds her voice and her own path to independence and love in this enduring classic of English literature."
    },
    {
        id: 9,
        title: "The Prisoner of Zenda",
        author: "Anthony Hope",
        price: 20.00,
        popularity: 780,
        image: "images/book1.jpg",
        description: "An Englishman on holiday is mistaken for a king he happens to resemble, and is drawn into a plot to save the throne in this classic adventure of swashbuckling and mistaken identity."
    },
    {
        id: 10,
        title: "The Metamorphosis",
        author: "Franz Kafka",
        price: 19.50,
        popularity: 1600,
        image: "images/book3.jpg",
        description: "A traveling salesman wakes one morning to find himself transformed into a giant insect, in Kafka's unsettling meditation on alienation and the fragility of identity."
    },
    {
        id: 11,
        title: "Jannat Kay Pattay",
        author: "Nemrah Ahmed",
        price: 18.00,
        popularity: 1400,
        image: "images/book4.jpg",
        description: "A story of faith, love, and self-discovery that follows its characters through personal struggle toward a deeper understanding of purpose and belief."
    },
    {
        id: 12,
        title: "The Kite Runner",
        author: "Khaled Hosseini",
        price: 22.50,
        popularity: 2200,
        image: "images/book5.jpg",
        description: "A story of friendship and betrayal between two boys in Afghanistan, and one man's journey to atone for the mistakes of his childhood."
    },
    {
        id: 13,
        title: "Wuthering Heights",
        author: "The Brontë Sisters",
        price: 23.00,
        popularity: 1850,
        image: "images/book-2.jpg",
        description: "A turbulent tale of passion and revenge on the Yorkshire moors, following the destructive love between Catherine Earnshaw and Heathcliff across two generations."
    }
];
/* END: Book Search & Cart Feature - shared book catalog data */

if (typeof module !== "undefined" && module.exports) {
    module.exports = BOOKS;
}