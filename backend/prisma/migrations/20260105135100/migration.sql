/*
  Warnings:

  - A unique constraint covering the columns `[topicId,text]` on the table `Question` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Question_topicId_text_key" ON "Question"("topicId", "text");
